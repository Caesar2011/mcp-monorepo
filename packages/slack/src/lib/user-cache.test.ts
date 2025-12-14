import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./slack-client.js', () => ({
  slackClient: {
    users: {
      list: vi.fn(),
    },
  },
  paginate: vi.fn(),
}))

describe('user-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the module-level cache by reimporting
    vi.resetModules()
    // Mock console.log to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getMemberListCache', () => {
    it('should fetch members from Slack API on first call', async () => {
      const mockMembers = [
        { id: 'U123', real_name: 'John Doe', name: 'john' },
        { id: 'U456', real_name: 'Jane Smith', name: 'jane' },
      ]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { members: mockMembers }
      })

      const { getMemberListCache } = await import('./user-cache.js')
      const result = await getMemberListCache()

      expect(paginate).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        U123: { id: 'U123', real_name: 'John Doe', name: 'john' },
        U456: { id: 'U456', real_name: 'Jane Smith', name: 'jane' },
      })
    })

    it('should return cached members on subsequent calls', async () => {
      const mockMembers = [{ id: 'U123', real_name: 'John Doe', name: 'john' }]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { members: mockMembers }
      })

      const { getMemberListCache } = await import('./user-cache.js')

      // First call
      const result1 = await getMemberListCache()
      // Second call
      const result2 = await getMemberListCache()

      expect(paginate).toHaveBeenCalledTimes(1) // Should only be called once
      expect(result1).toEqual({
        U123: { id: 'U123', real_name: 'John Doe', name: 'john' },
      })
      expect(result2).toEqual({
        U123: { id: 'U123', real_name: 'John Doe', name: 'john' },
      })
      expect(result1).toBe(result2) // Should be the same promise result
    })

    it('should handle multiple paginated responses', async () => {
      const mockMembers1 = [{ id: 'U123', real_name: 'John Doe', name: 'john' }]
      const mockMembers2 = [{ id: 'U456', real_name: 'Jane Smith', name: 'jane' }]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { members: mockMembers1 }
        yield { members: mockMembers2 }
      })

      const { getMemberListCache } = await import('./user-cache.js')
      const result = await getMemberListCache()

      expect(result).toEqual({
        U123: { id: 'U123', real_name: 'John Doe', name: 'john' },
        U456: { id: 'U456', real_name: 'Jane Smith', name: 'jane' },
      })
    })

    it('should handle responses without members property', async () => {
      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { channels: ['channel1', 'channel2'] } // No members property
        yield { members: undefined } // Undefined members
      })

      const { getMemberListCache } = await import('./user-cache.js')
      const result = await getMemberListCache()

      expect(result).toEqual({})
    })

    it('should handle empty members array', async () => {
      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { members: [] }
      })

      const { getMemberListCache } = await import('./user-cache.js')
      const result = await getMemberListCache()

      expect(result).toEqual({})
    })

    it('should handle API errors', async () => {
      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(() => {
        throw new Error('API Error')
      })

      const { getMemberListCache } = await import('./user-cache.js')

      await expect(getMemberListCache()).rejects.toThrow('API Error')
    })

    it('should convert members array to Record with member IDs as keys', async () => {
      const mockMembers = [
        { id: 'U123', real_name: 'John Doe', name: 'john', profile: { email: 'john@example.com' } },
        { id: 'U456', real_name: 'Jane Smith', name: 'jane', profile: { email: 'jane@example.com' } },
        { id: 'U789', real_name: 'Bob Wilson', name: 'bob', profile: { email: 'bob@example.com' } },
      ]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { members: mockMembers }
      })

      const { getMemberListCache } = await import('./user-cache.js')
      const result = await getMemberListCache()

      expect(result).toEqual({
        U123: { id: 'U123', real_name: 'John Doe', name: 'john', profile: { email: 'john@example.com' } },
        U456: { id: 'U456', real_name: 'Jane Smith', name: 'jane', profile: { email: 'jane@example.com' } },
        U789: { id: 'U789', real_name: 'Bob Wilson', name: 'bob', profile: { email: 'bob@example.com' } },
      })
    })

    it('should handle members with duplicate IDs (last one wins)', async () => {
      const mockMembers = [
        { id: 'U123', real_name: 'John Doe', name: 'john' },
        { id: 'U123', real_name: 'John Smith', name: 'johnsmith' }, // Duplicate ID
      ]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { members: mockMembers }
      })

      const { getMemberListCache } = await import('./user-cache.js')
      const result = await getMemberListCache()

      expect(result).toEqual({
        U123: { id: 'U123', real_name: 'John Smith', name: 'johnsmith' },
      })
    })
  })

  describe('preloadMemberListCache', () => {
    it('should preload the member cache', async () => {
      const mockMembers = [{ id: 'U123', real_name: 'John Doe', name: 'john' }]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { members: mockMembers }
      })

      const { preloadMemberListCache, getMemberListCache } = await import('./user-cache.js')

      // Preload the cache
      await preloadMemberListCache()

      // Subsequent call should use cached data
      const result = await getMemberListCache()

      expect(paginate).toHaveBeenCalledTimes(1) // Should only be called once during preload
      expect(result).toEqual({
        U123: { id: 'U123', real_name: 'John Doe', name: 'john' },
      })
    })

    it('should handle preload errors', async () => {
      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(() => {
        throw new Error('Preload Error')
      })

      const { preloadMemberListCache } = await import('./user-cache.js')

      await expect(preloadMemberListCache()).rejects.toThrow('Preload Error')
    })

    it('should not duplicate API calls if preload is called multiple times', async () => {
      const mockMembers = [{ id: 'U123', real_name: 'John Doe', name: 'john' }]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { members: mockMembers }
      })

      const { preloadMemberListCache } = await import('./user-cache.js')

      // Call preload multiple times
      await Promise.all([preloadMemberListCache(), preloadMemberListCache(), preloadMemberListCache()])

      expect(paginate).toHaveBeenCalledTimes(1) // Should only be called once
    })
  })
})
