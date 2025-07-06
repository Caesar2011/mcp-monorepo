import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  storeShortTermHandler,
  storeMidTermHandler,
  storeLongTermHandler,
  removeLongTermHandler,
  searchMemoriesHandler,
  getAllMemoriesHandler,
} from './handler.js'

// Mock all helper functions
vi.mock('./helpers.js', () => ({
  cleanupExpiredMemories: vi.fn(),
  storeMemory: vi.fn(),
  findMemoryById: vi.fn(),
  deleteMemoryById: vi.fn(),
  searchMemoriesByKeyword: vi.fn(),
  getAllMemories: vi.fn(),
  groupMemoriesByType: vi.fn(),
  calculateMemoryStats: vi.fn(),
  formatMemory: vi.fn(),
  getStorageDuration: vi.fn(),
  formatExpiryDate: vi.fn(),
  getStorageTypeEmoji: vi.fn(),
  getStorageTypeDisplayName: vi.fn(),
}))

import {
  cleanupExpiredMemories,
  storeMemory,
  findMemoryById,
  deleteMemoryById,
  searchMemoriesByKeyword,
  getAllMemories,
  groupMemoriesByType,
  calculateMemoryStats,
  formatMemory,
  getStorageDuration,
  formatExpiryDate,
  getStorageTypeEmoji,
  getStorageTypeDisplayName,
  Memory,
  StorageType,
  MemoryStats,
  GroupedMemories,
} from './helpers.js'

describe('Memory Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Store Memory Handlers', () => {
    const testCases = [
      {
        handler: storeShortTermHandler,
        storageType: 'short_term' as StorageType,
        displayName: 'short-term',
      },
      {
        handler: storeMidTermHandler,
        storageType: 'mid_term' as StorageType,
        displayName: 'mid-term',
      },
      {
        handler: storeLongTermHandler,
        storageType: 'long_term' as StorageType,
        displayName: 'long-term',
      },
    ]

    testCases.forEach(({ handler, storageType, displayName }) => {
      describe(`${displayName} memory handler`, () => {
        it('should store memory successfully with category', async () => {
          const mockId = 123
          const mockDuration = '7 days'
          const mockExpiryDate = '2024-01-01'

          vi.mocked(storeMemory).mockReturnValue(mockId)
          vi.mocked(getStorageDuration).mockReturnValue(mockDuration)
          vi.mocked(formatExpiryDate).mockReturnValue(mockExpiryDate)

          const result = await handler({
            memory: 'Test memory content',
            category: 'test-category',
          })

          expect(cleanupExpiredMemories).toHaveBeenCalledOnce()
          expect(storeMemory).toHaveBeenCalledWith('Test memory content', 'test-category', storageType)
          expect(getStorageDuration).toHaveBeenCalledWith(storageType)

          expect(result).toEqual({
            content: [
              {
                type: 'text',
                text: expect.stringContaining(`✅ ${displayName} memory stored successfully!`),
                _meta: { stderr: '', exitCode: 0 },
              },
            ],
          })

          const textContent = result.content[0] as { type: 'text'; text: string }
          expect(textContent.text).toContain(`ID: ${mockId}`)
          expect(textContent.text).toContain('Content: Test memory content')
          expect(textContent.text).toContain('Category: test-category')
          expect(textContent.text).toContain(`Storage: ${mockDuration}`)
        })

        it('should store memory successfully without category', async () => {
          const mockId = 456
          vi.mocked(storeMemory).mockReturnValue(mockId)
          vi.mocked(getStorageDuration).mockReturnValue('7 days')

          const result = await handler({
            memory: 'Test memory without category',
          })

          expect(storeMemory).toHaveBeenCalledWith('Test memory without category', null, storageType)

          const textContent = result.content[0] as { type: 'text'; text: string }
          expect(textContent.text).toContain('Category: None')
        })

        it('should handle long-term memory expiry correctly', async () => {
          if (storageType === 'long_term') {
            vi.mocked(storeMemory).mockReturnValue(789)
            vi.mocked(getStorageDuration).mockReturnValue('Permanent')

            const result = await handler({
              memory: 'Long term memory',
            })

            const textContent = result.content[0] as { type: 'text'; text: string }
            expect(textContent.text).toContain('Expires: Never')
          }
        })

        it('should handle store memory errors', async () => {
          const errorMessage = 'Storage failed'
          vi.mocked(storeMemory).mockImplementation(() => {
            throw new Error(errorMessage)
          })

          const result = await handler({
            memory: 'Test memory',
          })

          expect(result).toEqual({
            content: [
              {
                type: 'text',
                text: `❌ Error storing ${displayName} memory: ${errorMessage}`,
                _meta: { stderr: errorMessage, exitCode: 1 },
              },
            ],
          })
        })

        it('should handle non-Error exceptions', async () => {
          vi.mocked(storeMemory).mockImplementation(() => {
            throw 'String error'
          })

          const result = await handler({
            memory: 'Test memory',
          })

          const textContent = result.content[0] as { type: 'text'; text: string; _meta: { stderr: string; exitCode: number } }
          expect(textContent.text).toContain('String error')
          expect(textContent._meta).toEqual({ stderr: 'String error', exitCode: 1 })
        })
      })
    })
  })

  describe('removeLongTermHandler', () => {
    it('should remove long-term memory successfully', async () => {
      const mockMemory: Memory = {
        id: 123,
        content: 'Test memory content',
        category: 'test-category',
        storage_type: 'long_term',
        created_at: '2024-01-01 00:00:00',
        invalid_after: null,
        created_timestamp: Date.now(),
      }

      vi.mocked(findMemoryById).mockReturnValue(mockMemory)
      vi.mocked(deleteMemoryById).mockReturnValue(true)

      const result = await removeLongTermHandler({ id: 123 })

      expect(cleanupExpiredMemories).toHaveBeenCalledOnce()
      expect(findMemoryById).toHaveBeenCalledWith(123, 'long_term')
      expect(deleteMemoryById).toHaveBeenCalledWith(123, 'long_term')

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('✅ Long-term memory removed successfully!'),
            _meta: { stderr: '', exitCode: 0 },
          },
        ],
      })

      const textContent = result.content[0] as { type: 'text'; text: string }
      expect(textContent.text).toContain('Removed ID: 123')
      expect(textContent.text).toContain('Content: Test memory content')
      expect(textContent.text).toContain('Category: test-category')
    })

    it('should handle memory without category', async () => {
      const mockMemory: Memory = {
        id: 123,
        content: 'Test memory content',
        category: null,
        storage_type: 'long_term',
        created_at: '2024-01-01 00:00:00',
        invalid_after: null,
        created_timestamp: Date.now(),
      }

      vi.mocked(findMemoryById).mockReturnValue(mockMemory)
      vi.mocked(deleteMemoryById).mockReturnValue(true)

      const result = await removeLongTermHandler({ id: 123 })

      const textContent = result.content[0] as { type: 'text'; text: string }
      expect(textContent.text).toContain('Category: None')
    })

    it('should handle memory not found', async () => {
      vi.mocked(findMemoryById).mockReturnValue(null)

      const result = await removeLongTermHandler({ id: 999 })

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Long-term memory with ID 999 not found',
            _meta: { stderr: 'Memory ID 999 not found', exitCode: 1 },
          },
        ],
      })
    })

    it('should handle delete operation failure', async () => {
      const mockMemory: Memory = {
        id: 123,
        content: 'Test memory content',
        category: 'test-category',
        storage_type: 'long_term',
        created_at: '2024-01-01 00:00:00',
        invalid_after: null,
        created_timestamp: Date.now(),
      }

      vi.mocked(findMemoryById).mockReturnValue(mockMemory)
      vi.mocked(deleteMemoryById).mockReturnValue(false)

      const result = await removeLongTermHandler({ id: 123 })

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Failed to remove memory with ID 123',
            _meta: { stderr: 'Delete operation failed for ID 123', exitCode: 1 },
          },
        ],
      })
    })

    it('should handle errors during removal', async () => {
      const errorMessage = 'Database error'
      vi.mocked(findMemoryById).mockImplementation(() => {
        throw new Error(errorMessage)
      })

      const result = await removeLongTermHandler({ id: 123 })

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `❌ Error removing long-term memory: ${errorMessage}`,
            _meta: { stderr: errorMessage, exitCode: 1 },
          },
        ],
      })
    })
  })

  describe('searchMemoriesHandler', () => {
    it('should return search results when memories are found', async () => {
      const mockMemories: Memory[] = [
        {
          id: 1,
          content: 'First test memory',
          category: 'test',
          storage_type: 'long_term',
          created_at: '2024-01-01 00:00:00',
          invalid_after: null,
          created_timestamp: Date.now(),
        },
        {
          id: 2,
          content: 'Second test memory',
          category: 'test',
          storage_type: 'short_term',
          created_at: '2024-01-01 00:00:00',
          invalid_after: Date.now() + 100000,
          created_timestamp: Date.now(),
        },
      ]

      vi.mocked(searchMemoriesByKeyword).mockReturnValue(mockMemories)
      vi.mocked(formatMemory).mockImplementation(
        (memory) => `[ID: ${memory.id}] ${memory.content} [${memory.category}]`
      )

      const result = await searchMemoriesHandler({ keyword: 'test' })

      expect(cleanupExpiredMemories).toHaveBeenCalledOnce()
      expect(searchMemoriesByKeyword).toHaveBeenCalledWith('test')

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('🔍 Found 2 memories matching "test"'),
            _meta: { stderr: '', exitCode: 0 },
          },
        ],
      })

      const textContent = result.content[0] as { type: 'text'; text: string }
      expect(textContent.text).toContain('[ID: 1] First test memory [test]')
      expect(textContent.text).toContain('[ID: 2] Second test memory [test]')
    })

    it('should handle no search results', async () => {
      vi.mocked(searchMemoriesByKeyword).mockReturnValue([])

      const result = await searchMemoriesHandler({ keyword: 'nonexistent' })

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '🔍 No memories found matching keyword: "nonexistent"',
            _meta: { stderr: '', exitCode: 0 },
          },
        ],
      })
    })

    it('should handle search errors', async () => {
      const errorMessage = 'Search failed'
      vi.mocked(searchMemoriesByKeyword).mockImplementation(() => {
        throw new Error(errorMessage)
      })

      const result = await searchMemoriesHandler({ keyword: 'test' })

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `❌ Error searching memories: ${errorMessage}`,
            _meta: { stderr: errorMessage, exitCode: 1 },
          },
        ],
      })
    })
  })

  describe('getAllMemoriesHandler', () => {
    it('should return all memories grouped by type', async () => {
      const mockMemories: [Memory, Memory] = [
        {
          id: 1,
          content: 'Long term memory',
          category: 'important',
          storage_type: 'long_term',
          created_at: '2024-01-01 00:00:00',
          invalid_after: null,
          created_timestamp: Date.now(),
        },
        {
          id: 2,
          content: 'Short term memory',
          category: 'temp',
          storage_type: 'short_term',
          created_at: '2024-01-01 00:00:00',
          invalid_after: Date.now() + 100000,
          created_timestamp: Date.now(),
        },
      ]

      const mockGrouped: GroupedMemories = {
        long_term: [mockMemories[0]],
        mid_term: [],
        short_term: [mockMemories[1]],
      }

      const mockStats: MemoryStats = {
        total: 2,
        long_term: 1,
        mid_term: 0,
        short_term: 1,
      }

      vi.mocked(getAllMemories).mockReturnValue(mockMemories)
      vi.mocked(groupMemoriesByType).mockReturnValue(mockGrouped)
      vi.mocked(calculateMemoryStats).mockReturnValue(mockStats)
      vi.mocked(formatMemory).mockImplementation((memory) => `${memory.id}: ${memory.content}`)
      vi.mocked(getStorageTypeEmoji).mockImplementation((type) =>
        type === 'long_term' ? '🏛️' : type === 'short_term' ? '⏰' : '📅'
      )
      vi.mocked(getStorageTypeDisplayName).mockImplementation((type) =>
        type === 'long_term' ? 'LONG-TERM MEMORIES (Permanent)' : type === 'short_term' ? 'SHORT-TERM MEMORIES (7 days)' : 'MID-TERM MEMORIES (3 months)'
      )

      const result = await getAllMemoriesHandler()

      expect(cleanupExpiredMemories).toHaveBeenCalledOnce()
      expect(getAllMemories).toHaveBeenCalledOnce()
      expect(groupMemoriesByType).toHaveBeenCalledWith(mockMemories)
      expect(calculateMemoryStats).toHaveBeenCalledWith(mockMemories)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('📝 All Memories (2 total)'),
            _meta: { stderr: '', exitCode: 0 },
          },
        ],
      })

      const textContent = result.content[0] as { type: 'text'; text: string }
      expect(textContent.text).toContain('Long-term: 1 | Mid-term: 0 | Short-term: 1')
      expect(textContent.text).toContain('🏛️ LONG-TERM MEMORIES (Permanent):')
      expect(textContent.text).toContain('1: Long term memory')
      expect(textContent.text).toContain('⏰ SHORT-TERM MEMORIES (7 days):')
      expect(textContent.text).toContain('2: Short term memory')
    })

    it('should handle no memories stored', async () => {
      vi.mocked(getAllMemories).mockReturnValue([])

      const result = await getAllMemoriesHandler()

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '📝 No memories stored yet',
            _meta: { stderr: '', exitCode: 0 },
          },
        ],
      })
    })

    it('should skip empty storage types', async () => {
      const mockMemories: [Memory] = [
        {
          id: 1,
          content: 'Long term memory',
          category: 'important',
          storage_type: 'long_term',
          created_at: '2024-01-01 00:00:00',
          invalid_after: null,
          created_timestamp: Date.now(),
        },
      ]

      const mockGrouped: GroupedMemories = {
        long_term: [mockMemories[0]],
        mid_term: [],
        short_term: [],
      }

      const mockStats: MemoryStats = {
        total: 1,
        long_term: 1,
        mid_term: 0,
        short_term: 0,
      }

      vi.mocked(getAllMemories).mockReturnValue(mockMemories)
      vi.mocked(groupMemoriesByType).mockReturnValue(mockGrouped)
      vi.mocked(calculateMemoryStats).mockReturnValue(mockStats)
      vi.mocked(formatMemory).mockImplementation((memory) => `${memory.id}: ${memory.content}`)
      vi.mocked(getStorageTypeEmoji).mockReturnValue('🏛️')
      vi.mocked(getStorageTypeDisplayName).mockReturnValue('LONG-TERM MEMORIES (Permanent)')

      const result = await getAllMemoriesHandler()

      const textContent = result.content[0] as { type: 'text'; text: string }
      expect(textContent.text).toContain('🏛️ LONG-TERM MEMORIES (Permanent):')
      expect(textContent.text).not.toContain('MID-TERM MEMORIES')
      expect(textContent.text).not.toContain('SHORT-TERM MEMORIES')
    })

    it('should handle errors during retrieval', async () => {
      const errorMessage = 'Database error'
      vi.mocked(getAllMemories).mockImplementation(() => {
        throw new Error(errorMessage)
      })

      const result = await getAllMemoriesHandler()

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `❌ Error retrieving memories: ${errorMessage}`,
            _meta: { stderr: errorMessage, exitCode: 1 },
          },
        ],
      })
    })
  })
})
