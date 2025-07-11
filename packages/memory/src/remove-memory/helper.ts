// Helper for removing any memory by ID
import { getDatabase } from '../lib/getDatabase.js'
import { type Memory } from '../lib/types.js'

export function findMemoryById(id: number): Memory | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM memories WHERE id = ?')
  const result = stmt.get(id) as Memory | null
  return result ?? undefined
}

export function deleteMemoryById(id: number): boolean {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM memories WHERE id = ?')
  const result = stmt.run(id)
  return result.changes > 0
}
