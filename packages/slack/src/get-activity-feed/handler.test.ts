import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatActivityFeed, formatError } from './formatter.js'
import { getActivityFeedHandler } from './handler.js'
import { fetchActivityFeed } from './helper.js'

vi.mock('./helper.js', () => ({
  fetchActivityFeed: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatActivityFeed: vi.fn(),
  formatError: vi.fn(),
}))

describe('getActivityFeedHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return formatted activity feed data on success', async () => {
    const mockFeed = {
      ok: true,
      items: [
        {
          is_unread: false,
          feed_ts: '1',
          key: 'k',
          item: {
            type: 'thread_v2',
            bundle_info: {
              payload: { thread_entry: { channel_id: 'c', latest_ts: 't', thread_ts: 't', unread_msg_count: 1 } },
            },
          },
        },
      ],
      response_metadata: {},
    }
    const formatted = 'Feed: ...'
    vi.mocked(fetchActivityFeed).mockResolvedValue(mockFeed)
    vi.mocked(formatActivityFeed).mockResolvedValue(formatted)
    const result = await getActivityFeedHandler()
    expect(fetchActivityFeed).toHaveBeenCalled()
    expect(formatActivityFeed).toHaveBeenCalledWith(mockFeed)
    expect(result).toEqual({ content: [{ type: 'text', text: formatted }] })
  })

  it('should handle errors and format them', async () => {
    const error = new Error('fail')
    const msg = 'Error getting Slack activity feed: fail'
    vi.mocked(fetchActivityFeed).mockRejectedValue(error)
    vi.mocked(formatError).mockReturnValue(msg)
    const result = await getActivityFeedHandler()
    expect(formatError).toHaveBeenCalledWith(error)
    expect(result).toEqual({ content: [{ type: 'text', text: msg, _meta: { stderr: 'fail' } }] })
  })
})

