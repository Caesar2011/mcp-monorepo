import { type Connection, Index, type Table, connect } from '@lancedb/lancedb'
import { logger } from '@mcp-monorepo/shared'

import { DatabaseError } from '../errors.js'
import { StoreManager } from './manager.js'
import { SchemaMigrator } from './migration.js'
import { Retriever } from './retriever.js'
import { getDocumentsSchema } from './schema.js'

import type {
  ListItem,
  ListOptions,
  QueryFilters,
  QueryResult,
  StatusReport,
  VectorChunk,
  WatchedPath,
} from '../types.js'

// Table names are now internal constants, not part of the public config.
const DOCUMENTS_TABLE_NAME = 'documents'
const WATCHED_PATHS_TABLE_NAME = 'watched_paths'

export interface VectorStoreConfig {
  dbPath: string
  hybridWeight?: number
  maxDistance?: number
  grouping?: 'similar' | 'related'
}

/**
 * Manages all interactions with the LanceDB vector database.
 * This class serves as a facade, coordinating migration, retrieval, and management components.
 * An instance must be initialized via the `initialize()` method before use.
 */
export class VectorStore {
  private readonly config: VectorStoreConfig
  private db: Connection
  // This 'table' property refers to the documents/vector table.
  public table!: Table // Use definite assignment assertion, as it's guaranteed by initialize
  public retriever!: Retriever
  public manager!: StoreManager
  private ftsEnabled = false

  private constructor(config: VectorStoreConfig, db: Connection) {
    this.config = config
    this.db = db
  }

  static async create(config: VectorStoreConfig) {
    const db = await connect(config.dbPath)
    const vectorStore = new VectorStore(config, db)
    await vectorStore.initialize()
    return vectorStore
  }

  public close(): void {
    logger.info('VectorStore: Closing database connection.')
    this.db.close()
  }

  /**
   * Connects to the database, ensures all necessary tables exist and are migrated,
   * and initializes all components. This must be called before any other method.
   */
  private async initialize(): Promise<void> {
    try {
      const migrator = new SchemaMigrator(this.db, DOCUMENTS_TABLE_NAME)

      let documentsTable = await migrator.run()
      // If the table doesn't exist after migration (or at all), create it with the correct schema.
      if (!documentsTable) {
        logger.info(`VectorStore: Creating new table "${DOCUMENTS_TABLE_NAME}" with predefined schema.`)
        // Create the table with an empty array and the explicit schema.
        // This forces LanceDB to use our schema instead of inferring it.
        documentsTable = await this.db.createTable(DOCUMENTS_TABLE_NAME, [], { schema: getDocumentsSchema() })
      }

      this._setupComponents(documentsTable)
      await this._ensureFtsIndex()
      await this._ensureWatchedPathsTable()

      logger.info(`VectorStore initialized at: ${this.config.dbPath}`)
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Migration resulted in an empty table')) {
        logger.warn('A migration resulted in an empty table, which was recreated.')
        return
      }
      throw new DatabaseError('Failed to initialize VectorStore', error)
    }
  }

  /**
   * Inserts an array of vector chunks into the database.
   * The table is guaranteed to exist by the initialize method.
   * @param chunks - An array of vector chunks to insert.
   */
  public async insertChunks(chunks: VectorChunk[]): Promise<void> {
    if (chunks.length === 0) return

    try {
      await this.table.add(chunks as unknown as Record<string, unknown>[])
      // Rebuilding the index on every insert is expensive.
      // It's better to do this periodically via `optimize()`.
    } catch (error: unknown) {
      throw new DatabaseError('Failed to insert chunks into the database.', error)
    }
  }

  /**
   * Deletes all chunks associated with a given file path from the documents table.
   * @param filePath - The absolute or synthetic path of the document to delete.
   */
  public async deleteChunks(filePath: string): Promise<void> {
    try {
      const escapedFilePath = filePath.replace(/'/g, "''")
      await this.table.delete(`\`filePath\` = '${escapedFilePath}'`)
    } catch (error: unknown) {
      throw new DatabaseError(`Failed to delete chunks for file: ${filePath}`, error)
    }
  }

  /**
   * Executes a search query against the vector store.
   */
  public async search(
    queryVector: number[],
    queryText: string,
    limit = 10,
    filters?: QueryFilters,
  ): Promise<QueryResult[]> {
    if (!this.retriever) {
      return [] // If no table/retriever, search returns no results.
    }
    return this.retriever.search(queryVector, queryText, limit, filters)
  }

  /**
   * Lists all items in the vector store, with optional filtering and pagination.
   */
  public async listFiles(options?: ListOptions): Promise<ListItem[]> {
    if (!this.manager) {
      return [] // If no table/manager, list returns no results.
    }
    return this.manager.listFiles(options)
  }

  /**
   * Retrieves the current status of the RAG system.
   */
  public async getStatus(): Promise<StatusReport> {
    if (!this.table) {
      return {
        documentCount: 0,
        chunkCount: 0,
        memoryUsageMb: process.memoryUsage().heapUsed / 1024 / 1024,
        uptimeSeconds: process.uptime(),
        ftsIndexEnabled: false,
        searchMode: 'vector-only',
      }
    }

    const chunkCount = await this.table.countRows()
    const list = await this.listFiles({ limit: 1_000_000 }) // A pragmatic way to count unique files
    const searchMode = this.ftsEnabled && (this.config.hybridWeight ?? 0.6) > 0 ? 'hybrid' : 'vector-only'

    return {
      documentCount: list.length,
      chunkCount,
      memoryUsageMb: process.memoryUsage().heapUsed / 1024 / 1024,
      uptimeSeconds: process.uptime(),
      ftsIndexEnabled: this.ftsEnabled,
      searchMode,
    }
  }

  /**
   * Removes all expired text snippets from the database.
   */
  public async cleanupExpired(): Promise<number> {
    if (!this.manager) {
      return 0
    }
    const deletedCount = await this.manager.cleanupExpired()
    if (deletedCount > 0) {
      logger.info(`VectorStore: Triggering optimization after deleting ${deletedCount} documents.`)
      await this.optimize()
    }
    return deletedCount
  }

  /**
   * Optimizes the database table, which compacts segments and rebuilds indexes.
   * This can improve query performance after many writes.
   */
  public async optimize(): Promise<void> {
    if (!this.table) {
      logger.info('VectorStore: Skipping optimization as table does not exist.')
      return
    }
    try {
      logger.info('VectorStore: Starting database optimization...')
      await this.table.optimize()
      logger.info('VectorStore: Database optimization complete.')
    } catch (error: unknown) {
      logger.error('VectorStore: Database optimization failed.', error)
      throw new DatabaseError('Failed to optimize the database.', error)
    }
  }

  /**
   * Retrieves all chunks for a specific document path.
   */
  public async getChunksByPath(filePath: string): Promise<VectorChunk[]> {
    if (!this.manager) {
      return []
    }
    return this.manager.getChunksByPath(filePath)
  }

  /**
   * Retrieves all persisted watched paths from the database.
   * @returns A promise that resolves to an array of watched path configurations.
   */
  public async getWatchedPaths(): Promise<WatchedPath[]> {
    const table = await this.db.openTable(WATCHED_PATHS_TABLE_NAME)
    const records = await table.query().toArray()
    return records.map((r) => ({
      path: r.path as string,
      type: r.type as 'file' | 'folder',
      recursive: r.recursive as boolean,
      addedAt: r.addedAt as string,
    }))
  }

  /**
   * Adds or updates a path to be watched in the persistence layer.
   * This operation is idempotent.
   */
  public async addWatchedPath(path: string, type: 'file' | 'folder', recursive: boolean): Promise<void> {
    const table = await this.db.openTable(WATCHED_PATHS_TABLE_NAME)
    // Make it idempotent: delete any existing entry first.
    await table.delete(`path = '${path.replace(/'/g, "''")}'`).catch(() => {
      /* ignore if it doesn't exist */
    })
    await table.add([{ path, type, recursive, addedAt: new Date().toISOString() }])
  }

  /**
   * Removes a path from the persistence layer.
   */
  public async removeWatchedPath(path: string): Promise<void> {
    const table = await this.db.openTable(WATCHED_PATHS_TABLE_NAME)
    await table.delete(`path = '${path.replace(/'/g, "''")}'`)
  }

  private async _ensureWatchedPathsTable(): Promise<void> {
    const tableNames = await this.db.tableNames()
    if (!tableNames.includes(WATCHED_PATHS_TABLE_NAME)) {
      logger.info(`Creating new '${WATCHED_PATHS_TABLE_NAME}' table for persistence.`)
      // Create table with a dummy record to define the schema, then delete it.
      const table = await this.db.createTable(WATCHED_PATHS_TABLE_NAME, [
        { path: '__dummy__', type: 'file', recursive: false, addedAt: '' },
      ])
      await table.delete("path = '__dummy__'")
    }
  }

  private _setupComponents(table: Table): void {
    this.table = table
    this.retriever = new Retriever(this.table, {
      ...this.config,
      ftsEnabled: this.ftsEnabled,
    })
    this.manager = new StoreManager(this.table)
  }

  private async _ensureFtsIndex(): Promise<void> {
    if (!this.table) return

    try {
      await this.table.createIndex('text', { config: Index.fts() })
      this.ftsEnabled = true
      logger.info('VectorStore: FTS index is active.')
    } catch (error: unknown) {
      const msg = (error as Error).message
      if (msg.includes('already exists')) {
        this.ftsEnabled = true
        logger.info('VectorStore: FTS index already exists and is active.')
      } else {
        logger.error('VectorStore: FTS index creation failed. Hybrid search will be disabled.', error)
        this.ftsEnabled = false
      }
    }

    // Update the retriever with the correct FTS status
    if (this.retriever) this.retriever.setFtsEnabled(this.ftsEnabled)
  }
}
