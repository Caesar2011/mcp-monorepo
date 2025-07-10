// Generic memory storage helper
import { getDatabase } from './getDatabase.js'
import { getExpiryTimestamp } from './getExpiryTimestamp.js'
import { type StorageType } from './types.js'

/**
 * Store a memory of any storage type.
 * @param storageType 'short_term' | 'mid_term' | 'long_term'
 * @param content
 * @param category
 * @returns new memory row ID
 */
export function storeMemory(storageType: StorageType, content: string, category: string): number {
  const db = getDatabase()
  const createdTimestamp = Date.now()
  const invalidAfter = getExpiryTimestamp(storageType)
  const stmt = db.prepare(
    'INSERT INTO memories (content, category, storage_type, created_timestamp, invalid_after) VALUES (?, ?, ?, ?, ?)',
  )
  const result = stmt.run(content, category, storageType, createdTimestamp, invalidAfter)
  return Number(result.lastInsertRowid)
}
