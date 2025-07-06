import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import Database from 'better-sqlite3'
import {
  Memory,
  StorageType,
  cleanupExpiredMemories,
  getExpiryTimestamp,
  getStorageDuration,
  formatMemory,
  storeMemory,
  findMemoryById,
  deleteMemoryById,
  searchMemoriesByKeyword,
  getAllMemories,
  groupMemoriesByType,
  calculateMemoryStats,
  formatExpiryDate,
  getStorageTypeEmoji,
  getStorageTypeDisplayName,
} from './helpers.js'

// Mock database setup
let testDb: Database.Database

const initializeTestDatabase = () => {
  testDb = new Database(':memory:')

  // Create the memories table schema
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      category TEXT,
      storage_type TEXT NOT NULL CHECK(storage_type IN ('short_term', 'mid_term', 'long_term')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_timestamp INTEGER NOT NULL,
      invalid_after INTEGER
    )
  `)
}

const resetTestDatabase = () => {
  if (testDb) {
    testDb.exec('DELETE FROM memories')
    testDb.exec('DELETE FROM sqlite_sequence WHERE name = \'memories\'')
  }
}

// Mock the getDatabase function
vi.mock('./getDatabase.js', () => ({
  getDatabase: () => testDb
}))

describe.sequential('Memory Helpers', () => {
  beforeAll(() => {
    initializeTestDatabase()
  })

  beforeEach(() => {
    resetTestDatabase()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe.sequential('Storage Duration and Expiry', () => {
    const storageTypes: StorageType[] = ['short_term', 'mid_term', 'long_term']

    it.each(storageTypes)('should return correct storage duration for %s', (storageType) => {
      const expectedDurations = {
        short_term: '7 days',
        mid_term: '3 months',
        long_term: 'Permanent',
      }

      const result = getStorageDuration(storageType)
      expect(result).toBe(expectedDurations[storageType])
    })

    it.each(storageTypes)('should return correct emoji for %s', (storageType) => {
      const expectedEmojis = {
        short_term: '⏰',
        mid_term: '📅',
        long_term: '🏛️',
      }

      const result = getStorageTypeEmoji(storageType)
      expect(result).toBe(expectedEmojis[storageType])
    })

    it.each(storageTypes)('should return correct display name for %s', (storageType) => {
      const expectedNames = {
        short_term: 'SHORT-TERM MEMORIES (7 days)',
        mid_term: 'MID-TERM MEMORIES (3 months)',
        long_term: 'LONG-TERM MEMORIES (Permanent)',
      }

      const result = getStorageTypeDisplayName(storageType)
      expect(result).toBe(expectedNames[storageType])
    })

    it('should return null expiry for long_term storage', () => {
      const result = getExpiryTimestamp('long_term')
      expect(result).toBeNull()
    })

    it('should return future timestamp for short_term storage', () => {
      const now = Date.now()
      const result = getExpiryTimestamp('short_term')

      expect(result).not.toBeNull()
      expect(result!).toBeGreaterThan(now)
      expect(result!).toBeLessThanOrEqual(now + 7 * 24 * 60 * 60 * 1000)
    })

    it('should return future timestamp for mid_term storage', () => {
      const now = Date.now()
      const result = getExpiryTimestamp('mid_term')

      expect(result).not.toBeNull()
      expect(result!).toBeGreaterThan(now)
      expect(result!).toBeLessThanOrEqual(now + 90 * 24 * 60 * 60 * 1000)
    })
  })

  describe.sequential('formatExpiryDate', () => {
    it('should return "Never" for null input', () => {
      const result = formatExpiryDate(null)
      expect(result).toBe('Never')
    })

    it('should format timestamp to date string', () => {
      const timestamp = new Date('2024-12-25').getTime()
      const result = formatExpiryDate(timestamp)
      expect(result).toBe('2024-12-25')
    })
  })

  describe.sequential('storeMemory', () => {
    beforeEach(() => {
      resetTestDatabase()
    })

    it('should store memory with category', () => {
      const id = storeMemory('Test content', 'test-category', 'long_term')

      expect(id).toBeTypeOf('number')
      expect(id).toBeGreaterThan(0)

      const stored = findMemoryById(id)
      expect(stored).not.toBeNull()
      expect(stored!.content).toBe('Test content')
      expect(stored!.category).toBe('test-category')
      expect(stored!.storage_type).toBe('long_term')
    })

    it('should store memory without category', () => {
      const id = storeMemory('Test content', null, 'short_term')

      const stored = findMemoryById(id)
      expect(stored).not.toBeNull()
      expect(stored!.category).toBeNull()
    })

    it('should set correct expiry for different storage types', () => {
      const shortTermId = storeMemory('Short term', null, 'short_term')
      const longTermId = storeMemory('Long term', null, 'long_term')

      const shortTerm = findMemoryById(shortTermId)
      const longTerm = findMemoryById(longTermId)

      expect(shortTerm!.invalid_after).not.toBeNull()
      expect(longTerm!.invalid_after).toBeNull()
    })
  })

  describe.sequential('findMemoryById', () => {
    beforeEach(() => {
      resetTestDatabase()
    })

    it('should find existing memory', () => {
      const id = storeMemory('Test content', 'test', 'long_term')
      const found = findMemoryById(id)

      expect(found).not.toBeNull()
      expect(found!.id).toBe(id)
      expect(found!.content).toBe('Test content')
    })

    it('should return null for non-existent memory', () => {
      const found = findMemoryById(999)
      expect(found).toBeNull()
    })

    it('should find memory by ID and storage type', () => {
      const id1 = storeMemory('Long term', null, 'long_term')
      const id2 = storeMemory('Short term', null, 'short_term')

      const longTerm = findMemoryById(id1, 'long_term')
      const shortTerm = findMemoryById(id2, 'short_term')
      const notFound = findMemoryById(id1, 'short_term')

      expect(longTerm).not.toBeNull()
      expect(shortTerm).not.toBeNull()
      expect(notFound).toBeNull()
    })
  })

  describe.sequential('deleteMemoryById', () => {
    beforeEach(() => {
      resetTestDatabase()
    })

    it('should delete existing memory', () => {
      const id = storeMemory('Test content', null, 'long_term')

      const deleted = deleteMemoryById(id)
      expect(deleted).toBe(true)

      const found = findMemoryById(id)
      expect(found).toBeNull()
    })

    it('should return false for non-existent memory', () => {
      const deleted = deleteMemoryById(999)
      expect(deleted).toBe(false)
    })

    it('should delete only memory with matching ID and storage type', () => {
      const id1 = storeMemory('Long term', null, 'long_term')

      const deleted = deleteMemoryById(id1, 'short_term')
      expect(deleted).toBe(false)

      const stillExists = findMemoryById(id1)
      expect(stillExists).not.toBeNull()
    })
  })

  describe.sequential('searchMemoriesByKeyword', () => {
    beforeEach(() => {
      resetTestDatabase()
      storeMemory('JavaScript programming', 'coding', 'long_term')
      storeMemory('Python tutorial', 'coding', 'mid_term')
      storeMemory('Meeting notes', 'work', 'short_term')
      storeMemory('Shopping list', null, 'short_term')
    })

    it('should find memories by content keyword', () => {
      const results = searchMemoriesByKeyword('JavaScript')
      expect(results).toHaveLength(1)
      expect(results?.[0]?.content).toBe('JavaScript programming')
    })

    it('should find memories by category keyword', () => {
      const results = searchMemoriesByKeyword('coding')
      expect(results).toHaveLength(2)
      expect(results.map(m => m.content)).toContain('JavaScript programming')
      expect(results.map(m => m.content)).toContain('Python tutorial')
    })

    it('should return empty array for no matches', () => {
      const results = searchMemoriesByKeyword('nonexistent')
      expect(results).toHaveLength(0)
    })

    it('should be case-insensitive', () => {
      const results = searchMemoriesByKeyword('JAVASCRIPT')
      expect(results).toHaveLength(1)
    })

    it('should find partial matches', () => {
      const results = searchMemoriesByKeyword('prog')
      expect(results).toHaveLength(1)
      expect(results?.[0]?.content).toBe('JavaScript programming')
    })
  })

  describe.sequential('getAllMemories', () => {
    beforeEach(() => {
      resetTestDatabase()
    })

    it('should return empty array when no memories exist', () => {
      const memories = getAllMemories()
      expect(memories).toHaveLength(0)
    })

    it('should return all stored memories', () => {
      storeMemory('Memory 1', null, 'long_term')
      storeMemory('Memory 2', 'test', 'short_term')
      storeMemory('Memory 3', null, 'mid_term')

      const memories = getAllMemories()
      expect(memories).toHaveLength(3)
    })

    it('should order memories by storage type and creation time', async () => {
      const id1 = storeMemory('Long term 1', null, 'long_term')
      await new Promise(resolve => setTimeout(resolve, 1000))
      const id2 = storeMemory('Short term 1', null, 'short_term')
      await new Promise(resolve => setTimeout(resolve, 1000))
      const id3 = storeMemory('Long term 2', null, 'long_term')

      const memories = getAllMemories()

      // Should be ordered by storage_type, then by created_timestamp DESC
      expect(memories?.[0]?.id).toBe(id3) // Most recent long_term
      expect(memories?.[1]?.id).toBe(id1) // Older long_term
      expect(memories?.[2]?.id).toBe(id2) // Short_term
    })
  })

  describe.sequential('groupMemoriesByType', () => {
    it('should group empty array correctly', () => {
      const grouped = groupMemoriesByType([])

      expect(grouped.long_term).toHaveLength(0)
      expect(grouped.mid_term).toHaveLength(0)
      expect(grouped.short_term).toHaveLength(0)
    })

    it('should group memories by storage type', () => {
      const memories: Memory[] = [
        {
          id: 1,
          content: 'Long term',
          category: null,
          storage_type: 'long_term',
          created_at: '2024-01-01 00:00:00',
          invalid_after: null,
          created_timestamp: Date.now(),
        },
        {
          id: 2,
          content: 'Short term',
          category: null,
          storage_type: 'short_term',
          created_at: '2024-01-01 00:00:00',
          invalid_after: Date.now() + 100000,
          created_timestamp: Date.now(),
        },
      ]

      const grouped = groupMemoriesByType(memories)

      expect(grouped.long_term).toHaveLength(1)
      expect(grouped.mid_term).toHaveLength(0)
      expect(grouped.short_term).toHaveLength(1)
      expect(grouped.long_term?.[0]?.content).toBe('Long term')
      expect(grouped.short_term?.[0]?.content).toBe('Short term')
    })
  })

  describe.sequential('calculateMemoryStats', () => {
    it('should calculate stats for empty array', () => {
      const stats = calculateMemoryStats([])

      expect(stats.total).toBe(0)
      expect(stats.long_term).toBe(0)
      expect(stats.mid_term).toBe(0)
      expect(stats.short_term).toBe(0)
    })

    it('should calculate correct stats', () => {
      resetTestDatabase()
      storeMemory('Long 1', null, 'long_term')
      storeMemory('Long 2', null, 'long_term')
      storeMemory('Short 1', null, 'short_term')

      const memories = getAllMemories()
      const stats = calculateMemoryStats(memories)

      expect(stats.total).toBe(3)
      expect(stats.long_term).toBe(2)
      expect(stats.mid_term).toBe(0)
      expect(stats.short_term).toBe(1)
    })
  })

  describe.sequential('formatMemory', () => {
    it('should format memory with category', () => {
      const memory: Memory = {
        id: 123,
        content: 'Test memory',
        category: 'test-category',
        storage_type: 'long_term',
        created_at: '2024-01-01 00:00:00',
        invalid_after: null,
        created_timestamp: new Date('2024-01-01').getTime(),
      }

      const formatted = formatMemory(memory)

      expect(formatted).toContain('[ID: 123]')
      expect(formatted).toContain('Test memory')
      expect(formatted).toContain('[test-category]')
      expect(formatted).toContain('Permanent')
      expect(formatted).toContain('2024-01-01')
      expect(formatted).toContain('(permanent)')
    })

    it('should format memory without category', () => {
      const memory: Memory = {
        id: 456,
        content: 'No category memory',
        category: null,
        storage_type: 'short_term',
        created_at: '2024-01-01 00:00:00',
        invalid_after: Date.now() + 86400000, // 1 day from now
        created_timestamp: Date.now(),
      }

      const formatted = formatMemory(memory)

      expect(formatted).toContain('[ID: 456]')
      expect(formatted).toContain('No category memory')
      expect(formatted).not.toContain('[test-category]')
      expect(formatted).toContain('7 days')
      expect(formatted).toContain('expires')
    })
  })

  describe.sequential('cleanupExpiredMemories', () => {
    beforeEach(() => {
      resetTestDatabase()
    })

    it('should return 0 when no expired memories exist', () => {
      storeMemory('Long term memory', null, 'long_term')

      const cleaned = cleanupExpiredMemories()
      expect(cleaned).toBe(0)
    })

    it('should clean up expired memories', () => {
      // Store a memory that expires in the past
      const pastTimestamp = Date.now() - 86400000 // 1 day ago

      testDb.prepare(
        'INSERT INTO memories (content, category, storage_type, created_timestamp, invalid_after) VALUES (?, ?, ?, ?, ?)'
      ).run('Expired memory', null, 'short_term', pastTimestamp, pastTimestamp)

      // Store a valid memory
      storeMemory('Valid memory', null, 'long_term')

      expect(getAllMemories()).toHaveLength(2)

      const cleaned = cleanupExpiredMemories()
      expect(cleaned).toBe(1)
      expect(getAllMemories()).toHaveLength(1)
      expect(getAllMemories()?.[0]?.content).toBe('Valid memory')
    })

    it('should not clean up memories without expiry date', () => {
      storeMemory('Permanent memory', null, 'long_term')

      const cleaned = cleanupExpiredMemories()
      expect(cleaned).toBe(0)
      expect(getAllMemories()).toHaveLength(1)
    })
  })
})
