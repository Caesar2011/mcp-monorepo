import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./slack-client.js', () => ({
  slackClient: {
    users: {
      conversations: vi.fn(),
    },
  },
  paginate: vi.fn(),
}))

describe('channel-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the module-level cache by reimporting
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getChannelListCache', () => {
    it('should fetch channels from Slack API on first call', async () => {
      const mockChannels = [
        { id: 'C123', name: 'general', is_archived: false, is_user_deleted: false },
        { id: 'C456', name: 'random', is_archived: false, is_user_deleted: false },
      ]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { channels: mockChannels }
      })

      const { getChannelListCache } = await import('./channel-cache.js')
      const result = await getChannelListCache()

      expect(paginate).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockChannels)
    })

    it('should return cached channels on subsequent calls', async () => {
      const mockChannels = [{ id: 'C123', name: 'general', is_archived: false, is_user_deleted: false }]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { channels: mockChannels }
      })

      const { getChannelListCache } = await import('./channel-cache.js')

      // First call
      const result1 = await getChannelListCache()
      // Second call
      const result2 = await getChannelListCache()

      expect(paginate).toHaveBeenCalledTimes(1) // Should only be called once
      expect(result1).toEqual(mockChannels)
      expect(result2).toEqual(mockChannels)
      expect(result1).toBe(result2) // Should be the same promise result
    })

    it('should filter out archived channels', async () => {
      const mockChannels = [
        { id: 'C123', name: 'general', is_archived: false, is_user_deleted: false },
        { id: 'C456', name: 'archived', is_archived: true, is_user_deleted: false },
        { id: 'C789', name: 'random', is_archived: false, is_user_deleted: false },
      ]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { channels: mockChannels }
      })

      const { getChannelListCache } = await import('./channel-cache.js')
      const result = await getChannelListCache()

      expect(result).toEqual([
        { id: 'C123', name: 'general', is_archived: false, is_user_deleted: false },
        { id: 'C789', name: 'random', is_archived: false, is_user_deleted: false },
      ])
    })

    it('should filter out user deleted channels', async () => {
      const mockChannels = [
        { id: 'C123', name: 'general', is_archived: false, is_user_deleted: false },
        { id: 'C456', name: 'deleted', is_archived: false, is_user_deleted: true },
        { id: 'C789', name: 'random', is_archived: false, is_user_deleted: false },
      ]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { channels: mockChannels }
      })

      const { getChannelListCache } = await import('./channel-cache.js')
      const result = await getChannelListCache()

      expect(result).toEqual([
        { id: 'C123', name: 'general', is_archived: false, is_user_deleted: false },
        { id: 'C789', name: 'random', is_archived: false, is_user_deleted: false },
      ])
    })

    it('should handle multiple paginated responses', async () => {
      const mockChannels1 = [{ id: 'C123', name: 'general', is_archived: false, is_user_deleted: false }]
      const mockChannels2 = [{ id: 'C456', name: 'random', is_archived: false, is_user_deleted: false }]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { channels: mockChannels1 }
        yield { channels: mockChannels2 }
      })

      const { getChannelListCache } = await import('./channel-cache.js')
      const result = await getChannelListCache()

      expect(result).toEqual([...mockChannels1, ...mockChannels2])
    })

    it('should handle responses without channels property', async () => {
      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { users: ['user1', 'user2'] } // No channels property
        yield { channels: undefined } // Undefined channels
      })

      const { getChannelListCache } = await import('./channel-cache.js')
      const result = await getChannelListCache()

      expect(result).toEqual([])
    })

    it('should handle empty channels array', async () => {
      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { channels: [] }
      })

      const { getChannelListCache } = await import('./channel-cache.js')
      const result = await getChannelListCache()

      expect(result).toEqual([])
    })

    it('should handle API errors', async () => {
      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(() => {
        throw new Error('API Error')
      })

      const { getChannelListCache } = await import('./channel-cache.js')

      await expect(getChannelListCache()).rejects.toThrow('API Error')
    })

    it('should handle mixed channel types with filtering', async () => {
      const mockChannels = [
        { id: 'C123', name: 'general', is_archived: false, is_user_deleted: false },
        { id: 'C456', name: 'archived', is_archived: true, is_user_deleted: false },
        { id: 'C789', name: 'deleted', is_archived: false, is_user_deleted: true },
        { id: 'C101', name: 'both', is_archived: true, is_user_deleted: true },
        { id: 'C202', name: 'valid', is_archived: false, is_user_deleted: false },
      ]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { channels: mockChannels }
      })

      const { getChannelListCache } = await import('./channel-cache.js')
      const result = await getChannelListCache()

      expect(result).toEqual([
        { id: 'C123', name: 'general', is_archived: false, is_user_deleted: false },
        { id: 'C202', name: 'valid', is_archived: false, is_user_deleted: false },
      ])
    })
  })

  describe('preloadChannelListCache', () => {
    it('should preload the channel cache', async () => {
      const mockChannels = [{ id: 'C123', name: 'general', is_archived: false, is_user_deleted: false }]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { channels: mockChannels }
      })

      const { preloadChannelListCache, getChannelListCache } = await import('./channel-cache.js')

      // Preload the cache
      await preloadChannelListCache()

      // Subsequent call should use cached data
      const result = await getChannelListCache()

      expect(paginate).toHaveBeenCalledTimes(1) // Should only be called once during preload
      expect(result).toEqual(mockChannels)
    })

    it('should handle preload errors', async () => {
      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(() => {
        throw new Error('Preload Error')
      })

      const { preloadChannelListCache } = await import('./channel-cache.js')

      await expect(preloadChannelListCache()).rejects.toThrow('Preload Error')
    })

    it('should not duplicate API calls if preload is called multiple times', async () => {
      const mockChannels = [{ id: 'C123', name: 'general', is_archived: false, is_user_deleted: false }]

      const { paginate } = await import('./slack-client.js')
      vi.mocked(paginate).mockImplementation(async function* () {
        yield { channels: mockChannels }
      })

      const { preloadChannelListCache } = await import('./channel-cache.js')

      // Call preload multiple times
      await Promise.all([preloadChannelListCache(), preloadChannelListCache(), preloadChannelListCache()])

      expect(paginate).toHaveBeenCalledTimes(1) // Should only be called once
    })
  })
})
