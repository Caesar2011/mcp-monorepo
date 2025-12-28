import { buildWhereClause } from './retriever.js' // Assuming you export this helper
import { DataMapper } from './schema.js'

import type { ListItem, ListOptions, VectorChunk } from '../types.js'
import type { Table } from '@lancedb/lancedb'

/**
 * Handles administrative and management tasks for the vector store, like listing and cleaning documents.
 */
export class StoreManager {
  private readonly table: Table

  constructor(table: Table) {
    this.table = table
  }

  /**
   * Lists all unique documents in the store, with optional filtering and pagination.
   * This method first filters in the DB, then aggregates unique files in memory.
   * @param options - Optional filters and pagination settings.
   * @returns A promise that resolves to an array of list items.
   */
  public async listFiles(options: ListOptions = {}): Promise<ListItem[]> {
    const { limit = 20, offset = 0, filters } = options
    const query = this.table.query().select(['filePath', 'timestamp', 'metadata'])

    const whereClause = buildWhereClause(filters)
    if (whereClause) {
      query.where(whereClause)
    }

    // This still loads all *filtered* records into memory, but it's far more
    // efficient than loading the entire table, especially with filters applied.
    const filteredRecords = await query.toArray()

    const fileMap = new Map<
      string,
      { chunkCount: number; latestTimestamp: string; metadata: ReturnType<typeof DataMapper.toDocumentMetadata> }
    >()

    for (const record of filteredRecords) {
      const filePath = String(record.filePath)
      const timestamp = String(record.timestamp)
      const metadata = DataMapper.toDocumentMetadata(record.metadata)

      const existing = fileMap.get(filePath)
      if (existing) {
        existing.chunkCount++
        if (timestamp > existing.latestTimestamp) {
          existing.latestTimestamp = timestamp
          existing.metadata = metadata
        }
      } else {
        fileMap.set(filePath, { chunkCount: 1, latestTimestamp: timestamp, metadata })
      }
    }

    const sortedResults = Array.from(fileMap.entries())
      .map(
        ([filePath, data]): ListItem => ({
          filePath,
          chunkCount: data.chunkCount,
          timestamp: data.latestTimestamp,
          metadata: data.metadata,
        }),
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    // Apply pagination to the final, aggregated list
    return sortedResults.slice(offset, offset + limit)
  }

  /**
   * Removes all documents (and their chunks) that have expired.
   * @returns A promise that resolves to the number of documents deleted.
   */
  public async cleanupExpired(): Promise<number> {
    // LanceDB's WHERE clause is limited for string-based date comparisons.
    // Fetch candidates and filter locally for safety.
    const candidates = await this.table.query().where('metadata.expiresAt IS NOT NULL').toArray()

    const now = new Date().toISOString()
    const expiredFilePaths = new Set<string>()
    for (const record of candidates) {
      const metadata = record.metadata as { expiresAt?: string }
      if (metadata.expiresAt && metadata.expiresAt < now) {
        expiredFilePaths.add(record.filePath as string)
      }
    }

    if (expiredFilePaths.size > 0) {
      const filePathsArray = Array.from(expiredFilePaths)
      const deletePromises = filePathsArray.map((filePath) =>
        this.table.delete(`\`filePath\` = '${filePath.replace(/'/g, "''")}'`),
      )
      await Promise.all(deletePromises)
    }

    return expiredFilePaths.size
  }

  /**
   * Retrieves all chunks associated with a specific file path.
   * @param filePath - The full path of the document (e.g., '/path/to/file.pdf' or 'memory://label').
   * @returns A promise that resolves to an array of vector chunks.
   */
  public async getChunksByPath(filePath: string): Promise<VectorChunk[]> {
    const records = await this.table
      .query()
      .where(`\`filePath\` = '${filePath.replace(/'/g, "''")}'`)
      .toArray()
    return records.map(DataMapper.toVectorChunk)
  }
}
