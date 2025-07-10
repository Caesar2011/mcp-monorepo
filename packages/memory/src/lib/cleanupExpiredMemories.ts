// Removes expired memories from the database
import { getDatabase } from './getDatabase.js'

export function cleanupExpiredMemories(): void {
  const db = getDatabase()
  const now = Date.now()
  const result = db.prepare('DELETE FROM memories WHERE invalid_after IS NOT NULL AND invalid_after < ?').run(now)
  if (result.changes > 0) {
    console.log(`Cleaned up ${result.changes} expired memories`)
  }
  // no return
}
