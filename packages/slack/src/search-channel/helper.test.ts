import { describe, it, expect, vi, beforeEach } from 'vitest'

import { searchChannels } from './helper.js'

vi.mock('../lib/channel-cache.js', () => ({
  getChannelListCache: vi.fn(),
}))

describe('searchChannels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should filter channels by search term in name', async () => {
    const mockChannels = [
      { id: 'C1', name: 'general', topic: 'General discussion', purpose: 'Company updates', is_private: false },
      { id: 'C2', name: 'random', topic: 'Random chat', purpose: 'Casual conversation', is_private: false },
      { id: 'C3', name: 'dev-team', topic: 'Development', purpose: 'Dev discussions', is_private: true },
    ]

    const { getChannelListCache } = await import('../lib/channel-cache.js')
    vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)

    const result = await searchChannels({ search: 'dev' })

    expect(result.channels).toHaveLength(1)
    expect(result.channels[0].name).toBe('dev-team')
  })

  it('should filter channels by search term in topic', async () => {
    const mockChannels = [
      { id: 'C1', name: 'general', topic: 'General discussion', purpose: 'Company updates', is_private: false },
      { id: 'C2', name: 'random', topic: 'Random chat', purpose: 'Casual conversation', is_private: false },
    ]

    const { getChannelListCache } = await import('../lib/channel-cache.js')
    vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)

    const result = await searchChannels({ search: 'discussion' })

    expect(result.channels).toHaveLength(1)
    expect(result.channels[0].name).toBe('general')
  })

  it('should return all channels when search is empty', async () => {
    const mockChannels = [
      { id: 'C1', name: 'general', topic: 'General discussion', purpose: 'Company updates', is_private: false },
      { id: 'C2', name: 'random', topic: 'Random chat', purpose: 'Casual conversation', is_private: false },
    ]

    const { getChannelListCache } = await import('../lib/channel-cache.js')
    vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)

    const result = await searchChannels({ search: '' })

    expect(result.channels).toHaveLength(2)
  })

  it('should return empty array when no matches found', async () => {
    const mockChannels = [
      { id: 'C1', name: 'general', topic: 'General discussion', purpose: 'Company updates', is_private: false },
    ]

    const { getChannelListCache } = await import('../lib/channel-cache.js')
    vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)

    const result = await searchChannels({ search: 'nonexistent' })

    expect(result.channels).toHaveLength(0)
  })
})
