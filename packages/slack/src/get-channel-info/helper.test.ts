import { describe, it, expect, vi, beforeEach } from 'vitest'

import { fetchChannelInfo } from './helper.js'

vi.mock('../lib/channel-cache.js', () => ({
  getChannelListCache: vi.fn(),
}))

describe('fetchChannelInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return channel info when channel is found', async () => {
    const mockChannels = [
      {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_member: true,
        topic: 'General discussion',
        purpose: 'Company-wide announcements',
        num_members: 50,
      },
      {
        id: 'C456',
        name: 'random',
        is_private: false,
        is_member: true,
        topic: 'Random chat',
        purpose: 'Casual conversation',
        num_members: 25,
      },
    ]

    const { getChannelListCache } = await import('../lib/channel-cache.js')
    vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)

    const result = await fetchChannelInfo({ channelId: 'C123' })

    expect(getChannelListCache).toHaveBeenCalled()
    expect(result).toEqual({
      ok: true,
      channel: {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_member: true,
        topic: 'General discussion',
        purpose: 'Company-wide announcements',
        num_members: 50,
      },
    })
  })

  it('should throw error when channel is not found', async () => {
    const mockChannels = [
      {
        id: 'C123',
        name: 'general',
        is_private: false,
        is_member: true,
        topic: 'General discussion',
        purpose: 'Company-wide announcements',
        num_members: 50,
      },
    ]

    const { getChannelListCache } = await import('../lib/channel-cache.js')
    vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)

    await expect(fetchChannelInfo({ channelId: 'C999' })).rejects.toThrow(
      'Channel with id C999 not found in cache'
    )
  })

  it('should handle empty channel cache', async () => {
    const { getChannelListCache } = await import('../lib/channel-cache.js')
    vi.mocked(getChannelListCache).mockResolvedValue([])

    await expect(fetchChannelInfo({ channelId: 'C123' })).rejects.toThrow(
      'Channel with id C123 not found in cache'
    )
  })

  it('should handle channel cache errors', async () => {
    const { getChannelListCache } = await import('../lib/channel-cache.js')
    vi.mocked(getChannelListCache).mockRejectedValue(new Error('Cache error'))

    await expect(fetchChannelInfo({ channelId: 'C123' })).rejects.toThrow('Cache error')
  })

  it('should find channel with exact ID match', async () => {
    const mockChannels = [
      { id: 'C123', name: 'channel1', is_private: false, is_member: true },
      { id: 'C1234', name: 'channel2', is_private: false, is_member: true },
      { id: 'C12', name: 'channel3', is_private: false, is_member: true },
    ]

    const { getChannelListCache } = await import('../lib/channel-cache.js')
    vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)

    const result = await fetchChannelInfo({ channelId: 'C123' })

    expect(result.channel.name).toBe('channel1')
    expect(result.channel.id).toBe('C123')
  })
})
