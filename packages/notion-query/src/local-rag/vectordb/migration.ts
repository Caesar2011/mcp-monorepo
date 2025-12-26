import { logger } from '@mcp-monorepo/shared'
import * as arrow from 'apache-arrow'

import { DatabaseError } from '../errors.js'
import { getDocumentsSchema } from './schema.js'

import type { DocumentMetadata, VectorChunk } from '../types.js'
import type { Connection, Table } from '@lancedb/lancedb'

/**
 * Manages the detection and execution of database schema migrations.
 */
export class SchemaMigrator {
  private readonly db: Connection
  private readonly tableName: string

  constructor(db: Connection, tableName: string) {
    this.db = db
    this.tableName = tableName
  }

  /**
   * Checks if the table exists, and if so, whether it needs migration.
   * @returns A Promise that resolves to the migrated or validated table, or undefined if the table does not exist.
   */
  public async run(): Promise<Table | undefined> {
    const tableNames = await this.db.tableNames()
    if (!tableNames.includes(this.tableName)) {
      logger.info(`VectorStore: Table "${this.tableName}" will be created on first data insertion.`)
      return undefined
    }

    const table = await this.db.openTable(this.tableName)
    logger.info(`VectorStore: Opened existing table "${this.tableName}".`)

    if (await this._needsMigration(table)) {
      logger.warn('VectorStore: Schema migration required. Starting migration process...')
      return this._migrate(table)
    }

    logger.info('VectorStore: Table schema is up-to-date.')
    return table
  }

  /**
   * Checks if the table's schema is outdated.
   * @param table - The table to inspect.
   * @returns A Promise that resolves to true if migration is needed.
   */
  private async _needsMigration(table: Table): Promise<boolean> {
    try {
      const schema = await table.schema()
      const metadataField = schema.fields.find((f) => f.name === 'metadata')

      if (!metadataField || metadataField.type.typeId !== arrow.Type.Struct) {
        return true // Missing metadata struct entirely
      }

      const metadataChildren = (metadataField.type as arrow.Struct).children
      const fieldNames = new Set(metadataChildren.map((f) => f.name))

      // Check for key fields introduced in newer schemas.
      return !fieldNames.has('createdAt') || !fieldNames.has('updatedAt') || !fieldNames.has('tags')
    } catch (error) {
      logger.error('VectorStore: Error checking schema, assuming migration is needed.', error)
      return true
    }
  }

  /**
   * Performs the migration of data from the old table to a new one with the correct schema.
   * @param oldTable - The outdated table instance.
   * @returns A Promise that resolves to the new, migrated table instance.
   */
  private async _migrate(oldTable: Table): Promise<Table> {
    try {
      const allRecords = await oldTable.query().toArray()
      logger.info(`VectorStore: Read ${allRecords.length} records for migration.`)

      if (allRecords.length === 0) {
        await this.db.dropTable(this.tableName)
        logger.info('VectorStore: Dropped empty table. It will be recreated on the next insert.')
        // This will result in `run()` returning `undefined`, which is correct.
        throw new Error('Migration resulted in an empty table, which was dropped.')
      }

      const now = new Date().toISOString()
      const migratedRecords = allRecords.map((record): VectorChunk => {
        const rawMetadata = (record.metadata ?? {}) as Record<string, unknown>

        // Normalize tags from various possible formats
        let tags: string[] = []
        if (Array.isArray(rawMetadata.tags)) {
          tags = rawMetadata.tags
        } else if (
          rawMetadata.tags &&
          typeof (rawMetadata.tags as { toArray?: () => string[] }).toArray === 'function'
        ) {
          tags = (rawMetadata.tags as { toArray: () => string[] }).toArray()
        }

        const migratedMetadata: DocumentMetadata = {
          fileName: String(rawMetadata.fileName ?? 'unknown'),
          fileSize: Number(rawMetadata.fileSize ?? 0),
          fileType: String(rawMetadata.fileType ?? 'unknown'),
          language: (rawMetadata.language as string) || undefined,
          memoryType: (rawMetadata.memoryType as 'file' | 'text' | 'url') || undefined,
          tags,
          project: (rawMetadata.project as string) || undefined,
          expiresAt: (rawMetadata.expiresAt as string) || undefined,
          createdAt: String(rawMetadata.createdAt ?? record.timestamp ?? now),
          updatedAt: String(rawMetadata.updatedAt ?? record.timestamp ?? now),
          sourceUrl: (rawMetadata.sourceUrl as string) || undefined,
        }

        return {
          id: String(record.id),
          filePath: String(record.filePath),
          chunkIndex: Number(record.chunkIndex),
          text: String(record.text),
          vector: Array.from((record.vector as Float32Array) ?? []),
          metadata: migratedMetadata,
          timestamp: String(record.timestamp ?? now),
        }
      })

      await this.db.dropTable(this.tableName)
      logger.info('VectorStore: Dropped old table.')

      const newTable = await this.db.createTable(
        this.tableName,
        migratedRecords as unknown as Record<string, unknown>[],
        { schema: getDocumentsSchema() },
      )
      logger.info(`VectorStore: Created new table with ${migratedRecords.length} migrated records. Migration complete.`)
      return newTable
    } catch (error) {
      if (error instanceof Error && error.message.includes('Migration resulted in an empty table')) {
        // This is an expected outcome, not a true failure. Re-throw to be handled by the caller.
        throw error
      }
      throw new DatabaseError('Failed to migrate table schema.', error)
    }
  }
}
