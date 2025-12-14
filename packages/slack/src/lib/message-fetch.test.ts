import { describe, it, expect, vi, beforeEach } from 'vitest'

import { fetchMessageByTs } from './message-fetch.js'

vi.mock('./slack-client.js', () => ({
  slackClient: {
    conversations: {
      replies: vi.fn(),
    },
  },
}))

describe('message-fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear console.error mock
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('fetchMessageByTs', () => {
    it('should fetch and return the first message successfully', async () => {
      const mockResponse = {
        ok: true,
        messages: [
          {
            ts: '1234567890.123',
            user: 'U123',
            text: 'Hello world',
          },
        ],
      }

      const { slackClient } = await import('./slack-client.js')
      vi.mocked(slackClient.conversations.replies).mockResolvedValue(mockResponse)

      const result = await fetchMessageByTs({
        channel: 'C123',
        ts: '1234567890.123',
      })

      expect(slackClient.conversations.replies).toHaveBeenCalledWith({
        channel: 'C123',
        ts: '1234567890.123',
      })

      expect(result).toEqual({
        ts: '1234567890.123',
        user: 'U123',
        text: 'Hello world',
      })
    })

    it('should return undefined when no messages are found', async () => {
      const mockResponse = {
        ok: true,
        messages: [],
      }

      const { slackClient } = await import('./slack-client.js')
      vi.mocked(slackClient.conversations.replies).mockResolvedValue(mockResponse)

      const result = await fetchMessageByTs({
        channel: 'C123',
        ts: '1234567890.123',
      })

      expect(result).toBeUndefined()
    })

    it('should return undefined when messages is undefined', async () => {
      const mockResponse = {
        ok: true,
        messages: undefined,
      }

      const { slackClient } = await import('./slack-client.js')
      vi.mocked(slackClient.conversations.replies).mockResolvedValue(mockResponse)

      const result = await fetchMessageByTs({
        channel: 'C123',
        ts: '1234567890.123',
      })

      expect(result).toBeUndefined()
    })

    it('should log error when more than one message is returned', async () => {
      const mockResponse = {
        ok: true,
        messages: [
          {
            ts: '1234567890.123',
            user: 'U123',
            text: 'First message',
          },
          {
            ts: '1234567890.124',
            user: 'U456',
            text: 'Second message',
          },
        ],
      }

      const { slackClient } = await import('./slack-client.js')
      vi.mocked(slackClient.conversations.replies).mockResolvedValue(mockResponse)

      const result = await fetchMessageByTs({
        channel: 'C123',
        ts: '1234567890.123',
      })

      expect(result).toEqual({
        ts: '1234567890.123',
        user: 'U123',
        text: 'First message',
      })
    })

    it('should handle API errors gracefully', async () => {
      const { slackClient } = await import('./slack-client.js')
      vi.mocked(slackClient.conversations.replies).mockRejectedValue(new Error('API Error'))

      await expect(
        fetchMessageByTs({
          channel: 'C123',
          ts: '1234567890.123',
        }),
      ).rejects.toThrow('API Error')
    })

    it('should pass through optional thread_ts parameter', async () => {
      const mockResponse = {
        ok: true,
        messages: [
          {
            ts: '1234567890.123',
            user: 'U123',
            text: 'Thread message',
          },
        ],
      }

      const { slackClient } = await import('./slack-client.js')
      vi.mocked(slackClient.conversations.replies).mockResolvedValue(mockResponse)

      await fetchMessageByTs({
        channel: 'C123',
        ts: '1234567890.123',
        thread_ts: '1234567890.100',
      })

      expect(slackClient.conversations.replies).toHaveBeenCalledWith({
        channel: 'C123',
        ts: '1234567890.123',
      })
    })

    it('should handle empty string parameters', async () => {
      const mockResponse = {
        ok: true,
        messages: [],
      }

      const { slackClient } = await import('./slack-client.js')
      vi.mocked(slackClient.conversations.replies).mockResolvedValue(mockResponse)

      const result = await fetchMessageByTs({
        channel: '',
        ts: '',
      })

      expect(slackClient.conversations.replies).toHaveBeenCalledWith({
        channel: '',
        ts: '',
      })
      expect(result).toBeUndefined()
    })
  })
})
