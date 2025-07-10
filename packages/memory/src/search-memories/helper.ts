// Helper for searching memories by keyword
import { cleanupExpiredMemories } from '../lib/cleanupExpiredMemories.js'
import { getDatabase } from '../lib/getDatabase.js'
import { type Memory } from '../lib/types.js'

export function searchMemoriesByKeyword(keyword: string): Memory[] {
  cleanupExpiredMemories()
  const db = getDatabase()
  const stmt = db.prepare(
    'SELECT * FROM memories WHERE content LIKE ? OR category LIKE ? ORDER BY created_timestamp DESC',
  )
  const searchPattern = `%${keyword}%`
  return stmt.all(searchPattern, searchPattern) as Memory[]
}
