import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { fetchChannelSectionsAndList } from './helper.js'

vi.mock('../lib/channel-cache.js', () => ({
  getChannelListCache: vi.fn(),
}))

describe('fetchChannelSectionsAndList', () => {
  const OLD_ENV = { ...process.env }

  beforeEach(() => {
    process.env.XOXD_TOKEN = 'dummyd'
    process.env.XOXC_TOKEN = 'dummyc'
    process.env.TENANT_ID = 'dummytenant'
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = { ...OLD_ENV }
  })

  it('should fetch channel sections and merge with cached channels successfully', async () => {
    const mockSectionsResponse = {
      channel_sections: [
        {
          channel_section_id: 'S123',
          name: 'Development',
          type: 'custom',
          emoji: '💻',
          channel_ids_page: {
            count: 2,
            channel_ids: ['C123', 'C456'],
          },
        },
        {
          channel_section_id: 'S456',
          name: 'General',
          type: 'channels',
          emoji: '🏢',
          channel_ids_page: {
            count: 1,
            channel_ids: ['C789'],
          },
        },
        {
          channel_section_id: 'S789',
          name: 'Empty Section',
          type: 'custom',
          emoji: '📁',
          channel_ids_page: {
            count: 0,
            channel_ids: [],
          },
        },
      ],
    }

    const mockChannels = [
      { id: 'C123', name: 'dev-team', is_private: false, is_im: false, is_mpim: false },
      { id: 'C456', name: 'dev-frontend', is_private: false, is_im: false, is_mpim: false },
      { id: 'C789', name: 'general', is_private: false, is_im: false, is_mpim: false },
      { id: 'C999', name: 'random', is_private: false, is_im: false, is_mpim: false },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSectionsResponse),
    })

    const { getChannelListCache } = await import('../lib/channel-cache.js')
    vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)

    const result = await fetchChannelSectionsAndList()

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('users.channelSections.list'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Bearer dummyc',
        }),
      })
    )

    expect(getChannelListCache).toHaveBeenCalled()
    expect(result).toHaveLength(3) // 2 non-empty sections + 1 auto-generated section

    // Check Development section
    expect(result[0]).toEqual({
      id: 'S123',
      name: 'Development',
      type: 'custom',
      emoji: '💻',
      channels: [
        { id: 'C123', name: 'dev-team', is_private: false, is_im: false, is_mpim: false },
        { id: 'C456', name: 'dev-frontend', is_private: false, is_im: false, is_mpim: false },
      ],
    })

    // Check General section
    expect(result[1]).toEqual({
      id: 'S456',
      name: 'General',
      type: 'channels',
      emoji: '🏢',
      channels: [
        { id: 'C789', name: 'general', is_private: false, is_im: false, is_mpim: false },
      ],
    })

    // Check auto-generated section for uncategorized channels
    expect(result[2]).toEqual({
      id: 'S456', // Reuses the "channels" section ID
      name: 'General', // Reuses the "channels" section name
      type: 'channels',
      emoji: '🏢',
      channels: [
        { id: 'C999', name: 'random', is_private: false, is_im: false, is_mpim: false },
      ],
    })
  })

  it('should filter out empty sections', async () => {
    const mockSectionsResponse = {
      channel_sections: [
        {
          channel_section_id: 'S123',
          name: 'Empty Section',
          type: 'custom',
          emoji: '📁',
          channel_ids_page: {
            count: 0,
            channel_ids: [],
          },
        },
        {
          channel_section_id: 'S456',
          name: 'Non-empty Section',
          type: 'custom',
          emoji: '📂',
          channel_ids_page: {
            count: 1,
            channel_ids: ['C123'],
          },
        },
      ],
    }

    const mockChannels = [
      { id: 'C123', name: 'test', is_private: false, is_im: false, is_mpim: false },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSectionsResponse),
    })

    const { getChannelListCache } = await import('../lib/channel-cache.js')
    vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)

    const result = await fetchChannelSectionsAndList()

    expect(result).toHaveLength(2) // 1 non-empty section + 1 auto-generated section
    expect(result[0].name).toBe('Non-empty Section')
  })

  it('should handle channels not found in cache', async () => {
    const mockSectionsResponse = {
      channel_sections: [
        {
          channel_section_id: 'S123',
          name: 'Test Section',
          type: 'custom',
          emoji: '🧪',
          channel_ids_page: {
            count: 2,
            channel_ids: ['C123', 'C999'], // C999 doesn't exist in cache
          },
        },
      ],
    }

    const mockChannels = [
      { id: 'C123', name: 'existing', is_private: false, is_im: false, is_mpim: false },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSectionsResponse),
    })

    const { getChannelListCache } = await import('../lib/channel-cache.js')
    vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)

    const result = await fetchChannelSectionsAndList()

    expect(result[0].channels).toHaveLength(1) // Only the existing channel
    expect(result[0].channels[0].id).toBe('C123')
  })

  it('should throw error when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(fetchChannelSectionsAndList()).rejects.toThrow('Failed to fetch channel sections')
  })

  it('should throw error when no channel_sections in response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await expect(fetchChannelSectionsAndList()).rejects.toThrow('No channel_sections in response')
  })

  it('should exclude IM and MPIM channels from auto-generated section', async () => {
    const mockSectionsResponse = {
      channel_sections: [],
    }

    const mockChannels = [
      { id: 'C123', name: 'regular', is_private: false, is_im: false, is_mpim: false },
      { id: 'D456', name: 'dm', is_private: true, is_im: true, is_mpim: false },
      { id: 'G789', name: 'group', is_private: true, is_im: false, is_mpim: true },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSectionsResponse),
    })

    const { getChannelListCache } = await import('../lib/channel-cache.js')
    vi.mocked(getChannelListCache).mockResolvedValue(mockChannels)

    const result = await fetchChannelSectionsAndList()

    expect(result).toHaveLength(1) // Only auto-generated section
    expect(result[0].channels).toHaveLength(1) // Only regular channel
    expect(result[0].channels[0].id).toBe('C123')
  })

  it('should throw error when required environment variables are missing', async () => {
    delete process.env.XOXD_TOKEN

    await expect(fetchChannelSectionsAndList()).rejects.toThrow()
  })
})
