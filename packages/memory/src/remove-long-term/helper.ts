// Helper for removing long-term memories
import { getDatabase } from '../lib/getDatabase.js'
import { type Memory } from '../lib/types.js'

export function findLongTermMemoryById(id: number): Memory | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM memories WHERE id = ? AND storage_type = ?')
  const result = stmt.get(id, 'long_term') as Memory | null
  return result ?? undefined
}

export function deleteLongTermMemoryById(id: number): boolean {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM memories WHERE id = ? AND storage_type = ?')
  const result = stmt.run(id, 'long_term')
  return result.changes > 0
}
