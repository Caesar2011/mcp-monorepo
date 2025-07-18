import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { fetchChannelContent } from './helper.js'

describe('fetchChannelContent', () => {
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

  it('should fetch channel content with messages and replies successfully', async () => {
    const mockHistoryResponse = {
      ok: true,
      channel: { name: 'general' },
      history: {
        messages: [
          {
            ts: '1234567890.123',
            user: 'U123',
            text: 'Hello world',
            reply_count: 2,
            reactions: [
              { name: 'thumbsup', count: 3 },
              { name: 'heart', count: 1 },
            ],
          },
          {
            ts: '1234567891.456',
            user: 'U456',
            text: 'Another message',
            reply_count: 0,
          },
        ],
      },
    }

    const mockRepliesResponse = {
      ok: true,
      messages: [
        {
          user: 'U789',
          text: 'Reply 1',
          ts: '1234567890.124',
        },
        {
          user: 'U101',
          text: 'Reply 2',
          ts: '1234567890.125',
        },
      ],
    }

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRepliesResponse),
      })

    const result = await fetchChannelContent({ channelId: 'C123' })

    expect(global.fetch).toHaveBeenCalledTimes(2)

    // Check first call (channel history)
    expect(global.fetch).toHaveBeenNthCalledWith(1,
      expect.stringContaining('conversations.view'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Bearer dummyc',
        }),
      })
    )

    // Check second call (replies)
    expect(global.fetch).toHaveBeenNthCalledWith(2,
      expect.stringContaining('conversations.replies'),
      expect.objectContaining({
        method: 'POST',
      })
    )

    expect(result).toEqual({
      channelId: 'C123',
      name: 'general',
      messages: [
        {
          from: 'U123',
          text: 'Hello world',
          timestamp: '1234567890.123',
          reactionCount: 4,
          reactions: {
            thumbsup: 3,
            heart: 1,
          },
          replies: [
            {
              user: 'U789',
              text: 'Reply 1',
              timestamp: '1234567890.124',
            },
            {
              user: 'U101',
              text: 'Reply 2',
              timestamp: '1234567890.125',
            },
          ],
        },
        {
          from: 'U456',
          text: 'Another message',
          timestamp: '1234567891.456',
          reactionCount: 0,
          reactions: {},
          replies: [],
        },
      ],
    })
  })

  it('should handle messages without replies', async () => {
    const mockHistoryResponse = {
      ok: true,
      channel: { name: 'test' },
      history: {
        messages: [
          {
            ts: '1234567890.123',
            user: 'U123',
            text: 'Simple message',
            reply_count: 0,
          },
        ],
      },
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockHistoryResponse),
    })

    const result = await fetchChannelContent({ channelId: 'C123' })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].replies).toEqual([])
  })

  it('should handle failed replies fetch gracefully', async () => {
    const mockHistoryResponse = {
      ok: true,
      channel: { name: 'test' },
      history: {
        messages: [
          {
            ts: '1234567890.123',
            user: 'U123',
            text: 'Message with replies',
            reply_count: 1,
          },
        ],
      },
    }

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistoryResponse),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

    const result = await fetchChannelContent({ channelId: 'C123' })

    expect(result.messages[0].replies).toEqual([])
  })

  it('should throw error when channel history fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    })

    await expect(fetchChannelContent({ channelId: 'C123' })).rejects.toThrow('Failed to fetch channel messages')
  })

  it('should handle messages without reactions', async () => {
    const mockHistoryResponse = {
      ok: true,
      channel: { name: 'test' },
      history: {
        messages: [
          {
            ts: '1234567890.123',
            user: 'U123',
            text: 'No reactions',
            reply_count: 0,
          },
        ],
      },
    }

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockHistoryResponse),
    })

    const result = await fetchChannelContent({ channelId: 'C123' })

    expect(result.messages[0].reactionCount).toBe(0)
    expect(result.messages[0].reactions).toEqual({})
  })

  it('should throw error when required environment variables are missing', async () => {
    delete process.env.XOXD_TOKEN

    await expect(fetchChannelContent({ channelId: 'C123' })).rejects.toThrow()
  })
})
