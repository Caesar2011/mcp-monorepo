import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatChannelInfo, formatError } from './formatter.js'
import { getChannelInfoHandler } from './handler.js'
import { fetchChannelInfo } from './helper.js'

vi.mock('./helper.js', () => ({
  fetchChannelInfo: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatChannelInfo: vi.fn(),
  formatError: vi.fn(),
}))

describe('getChannelInfoHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return formatted channel info on success', async () => {
    const mockChan = {
      ok: true,
      channel: {
        id: 'C1',
        name: 'general',
        is_private: false,
        is_member: true,
        is_channel: true,
        is_archived: false,
        topic: { value: 't', creator: '', last_set: 1 },
        purpose: { value: 'p', creator: '', last_set: 1 },
        num_members: 10,
      },
    }
    const formatted = '#general | joined | topic: t | purpose: p | members: 10'
    vi.mocked(fetchChannelInfo).mockResolvedValue(mockChan)
    vi.mocked(formatChannelInfo).mockReturnValue(formatted)
    const result = await getChannelInfoHandler({ channelId: 'C1' })
    expect(fetchChannelInfo).toHaveBeenCalledWith({ channelId: 'C1' })
    expect(formatChannelInfo).toHaveBeenCalledWith(mockChan)
    expect(result).toEqual({ content: [{ type: 'text', text: formatted }] })
  })

  it('should handle errors and format them', async () => {
    const error = new Error('fail')
    const msg = 'Error getting Slack channel info: fail'
    vi.mocked(fetchChannelInfo).mockRejectedValue(error)
    vi.mocked(formatError).mockReturnValue(msg)
    const result = await getChannelInfoHandler({ channelId: 'C1' })
    expect(formatError).toHaveBeenCalledWith(error)
    expect(result).toEqual({ content: [{ type: 'text', text: msg, _meta: { stderr: 'fail' } }] })
  })
})

