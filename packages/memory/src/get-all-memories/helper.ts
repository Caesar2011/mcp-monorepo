// Helper for retrieving all memories
import { cleanupExpiredMemories } from '../lib/cleanupExpiredMemories.js'
import { getDatabase } from '../lib/getDatabase.js'
import { type Memory } from '../lib/types.js'

export function getAllMemories(): Memory[] {
  cleanupExpiredMemories()
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM memories ORDER BY storage_type, created_timestamp DESC')
  return stmt.all() as Memory[]
}
