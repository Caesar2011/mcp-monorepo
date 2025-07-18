import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatChannelContent, formatError } from './formatter.js'
import { getChannelContentHandler } from './handler.js'
import { fetchChannelContent } from './helper.js'

vi.mock('./helper.js', () => ({
  fetchChannelContent: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatChannelContent: vi.fn(),
  formatError: vi.fn(),
}))

describe('getChannelContentHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return formatted channel content on success', async () => {
    const mockResult = {
      channelId: 'C1',
      name: 'general',
      messages: [
        {
          from: 'U123',
          text: 'Hello',
          timestamp: '1',
          reactionCount: 2,
          reactions: { thumbsup: 2 },
          replies: [{ user: 'U2', text: 'hi', timestamp: '2' }],
        },
      ],
    }
    const formatted = 'Channel: #general\nFrom: U123 | Hello | Reactions: :thumbsup: 2\n Replies:\n U2: hi'
    vi.mocked(fetchChannelContent).mockResolvedValue(mockResult)
    vi.mocked(formatChannelContent).mockReturnValue(formatted)
    const result = await getChannelContentHandler({ channelId: 'C1' })
    expect(fetchChannelContent).toHaveBeenCalledWith({ channelId: 'C1' })
    expect(formatChannelContent).toHaveBeenCalledWith(mockResult)
    expect(result).toEqual({ content: [{ type: 'text', text: formatted }] })
  })

  it('should handle errors and format them', async () => {
    const error = new Error('fail')
    const msg = 'Error getting Slack channel content: fail'
    vi.mocked(fetchChannelContent).mockRejectedValue(error)
    vi.mocked(formatError).mockReturnValue(msg)
    const result = await getChannelContentHandler({ channelId: 'C1' })
    expect(formatError).toHaveBeenCalledWith(error)
    expect(result).toEqual({ content: [{ type: 'text', text: msg, _meta: { stderr: 'fail' } }] })
  })
})

