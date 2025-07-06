import Database from 'better-sqlite3'
import { getDatabase } from './getDatabase.js'

export interface Memory {
  id: number
  content: string
  category: string | null
  storage_type: StorageType
  created_at: string
  invalid_after: number | null
  created_timestamp: number
}

export type StorageType = 'short_term' | 'mid_term' | 'long_term'

export interface StoreMemoryArgs {
  memory: string
  category?: string | undefined
}

export interface RemoveMemoryArgs {
  id: number
}

export interface SearchMemoryArgs {
  keyword: string
}

export interface MemoryStats {
  long_term: number
  mid_term: number
  short_term: number
  total: number
}

export interface GroupedMemories {
  long_term: Memory[]
  mid_term: Memory[]
  short_term: Memory[]
}

// Clean up expired memories
export function cleanupExpiredMemories(): number {
  const db = getDatabase()
  const now = Date.now()
  const result = db.prepare('DELETE FROM memories WHERE invalid_after IS NOT NULL AND invalid_after < ?').run(now)

  if (result.changes > 0) {
    console.log(`Cleaned up ${result.changes} expired memories`)
  }

  return result.changes
}

// Calculate expiry date based on storage type
export function getExpiryTimestamp(storageType: StorageType): number | null {
  const now = Date.now()
  const timeMap: Record<StorageType, number | null> = {
    short_term: now + 7 * 24 * 60 * 60 * 1000, // 7 days
    mid_term: now + 90 * 24 * 60 * 60 * 1000, // 90 days
    long_term: null, // Never expires
  }

  return timeMap[storageType]
}

// Get human-readable storage duration
export function getStorageDuration(storageType: StorageType): string {
  const durationMap: Record<StorageType, string> = {
    short_term: '7 days',
    mid_term: '3 months',
    long_term: 'Permanent',
  }

  return durationMap[storageType]
}

// Format memory for display
export function formatMemory(memory: Memory): string {
  const createdDate = new Date(memory.created_timestamp).toISOString().split('T')[0]
  const categoryInfo = memory.category ? ` [${memory.category}]` : ''
  const storageInfo = getStorageDuration(memory.storage_type)

  let expiryInfo = ''
  if (memory.invalid_after) {
    const expiryDate = new Date(memory.invalid_after).toISOString().split('T')[0]
    const daysLeft = Math.ceil((memory.invalid_after - Date.now()) / (1000 * 60 * 60 * 24))
    expiryInfo = ` (expires ${expiryDate}, ${daysLeft} days left)`
  } else {
    expiryInfo = ' (permanent)'
  }

  return `[ID: ${memory.id}] ${memory.content}${categoryInfo} - ${storageInfo} (created: ${createdDate})${expiryInfo}`
}

// Store memory with given storage type
export function storeMemory(content: string, category: string | null, storageType: StorageType): number {
  const db = getDatabase()
  const createdTimestamp = Date.now()
  const invalidAfter = getExpiryTimestamp(storageType)

  const stmt = db.prepare(
    'INSERT INTO memories (content, category, storage_type, created_timestamp, invalid_after) VALUES (?, ?, ?, ?, ?)',
  )

  const result = stmt.run(content, category, storageType, createdTimestamp, invalidAfter)
  return Number(result.lastInsertRowid)
}

// Find memory by ID and storage type
export function findMemoryById(id: number, storageType?: StorageType): Memory | null {
  const db = getDatabase()
  let stmt: Database.Statement
  let params: (number | string)[]

  if (storageType) {
    stmt = db.prepare('SELECT * FROM memories WHERE id = ? AND storage_type = ?')
    params = [id, storageType]
  } else {
    stmt = db.prepare('SELECT * FROM memories WHERE id = ?')
    params = [id]
  }

  const result = stmt.get(...params) as Memory | undefined
  return result || null
}

// Delete memory by ID and storage type
export function deleteMemoryById(id: number, storageType?: StorageType): boolean {
  const db = getDatabase()
  let stmt: Database.Statement
  let params: (number | string)[]

  if (storageType) {
    stmt = db.prepare('DELETE FROM memories WHERE id = ? AND storage_type = ?')
    params = [id, storageType]
  } else {
    stmt = db.prepare('DELETE FROM memories WHERE id = ?')
    params = [id]
  }

  const result = stmt.run(...params)
  return result.changes > 0
}

// Search memories by keyword
export function searchMemoriesByKeyword(keyword: string): Memory[] {
  const db = getDatabase()
  const stmt = db.prepare(
    'SELECT * FROM memories WHERE content LIKE ? OR category LIKE ? ORDER BY created_timestamp DESC',
  )

  const searchPattern = `%${keyword}%`
  return stmt.all(searchPattern, searchPattern) as Memory[]
}

// Get all memories
export function getAllMemories(): Memory[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM memories ORDER BY storage_type, created_timestamp DESC')
  return stmt.all() as Memory[]
}

// Group memories by storage type
export function groupMemoriesByType(memories: Memory[]): GroupedMemories {
  const grouped: GroupedMemories = {
    long_term: [],
    mid_term: [],
    short_term: [],
  }

  memories.forEach((memory) => {
    grouped[memory.storage_type].push(memory)
  })

  return grouped
}

// Calculate memory statistics
export function calculateMemoryStats(memories: Memory[]): MemoryStats {
  const grouped = groupMemoriesByType(memories)

  return {
    long_term: grouped.long_term.length,
    mid_term: grouped.mid_term.length,
    short_term: grouped.short_term.length,
    total: memories.length,
  }
}

// Format expiry date for display
export function formatExpiryDate(invalidAfter: number | null): string {
  if (!invalidAfter) {
    return 'Never'
  }
  return new Date(invalidAfter).toISOString().split('T')[0] as string
}

// Get storage type display emoji
export function getStorageTypeEmoji(storageType: StorageType): string {
  const emojiMap: Record<StorageType, string> = {
    long_term: '🏛️',
    mid_term: '📅',
    short_term: '⏰',
  }

  return emojiMap[storageType]
}

// Get storage type display name
export function getStorageTypeDisplayName(storageType: StorageType): string {
  const displayMap: Record<StorageType, string> = {
    long_term: 'LONG-TERM MEMORIES (Permanent)',
    mid_term: 'MID-TERM MEMORIES (3 months)',
    short_term: 'SHORT-TERM MEMORIES (7 days)',
  }

  return displayMap[storageType]
}
