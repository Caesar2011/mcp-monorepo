import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatSearchChannelResult, formatError } from './formatter.js'
import { searchChannelHandler } from './handler.js'
import { searchChannels } from './helper.js'

vi.mock('./helper.js', () => ({
  searchChannels: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatSearchChannelResult: vi.fn(),
  formatError: vi.fn(),
}))

describe('searchChannelHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return formatted search results on success', async () => {
    const mockParams = { search: 'general' }
    const mockResult = {
      channels: [
        {
          id: 'C1',
          name: 'general',
          is_private: false,
          topic: 'General discussion',
          purpose: 'Company-wide announcements',
        },
      ],
    }
    const formatted = '#general | topic: General discussion | purpose: Company-wide announcements'
    vi.mocked(searchChannels).mockResolvedValue(mockResult)
    vi.mocked(formatSearchChannelResult).mockReturnValue(formatted)
    const result = await searchChannelHandler(mockParams)
    expect(searchChannels).toHaveBeenCalledWith(mockParams)
    expect(formatSearchChannelResult).toHaveBeenCalledWith(mockResult)
    expect(result).toEqual({ content: [{ type: 'text', text: formatted }] })
  })

  it('should handle errors and format them', async () => {
    const mockParams = { search: 'test' }
    const error = new Error('fail')
    const msg = 'Error searching Slack channels: fail'
    vi.mocked(searchChannels).mockRejectedValue(error)
    vi.mocked(formatError).mockReturnValue(msg)
    const result = await searchChannelHandler(mockParams)
    expect(formatError).toHaveBeenCalledWith(error)
    expect(result).toEqual({ content: [{ type: 'text', text: msg, _meta: { stderr: 'fail' } }] })
  })
})

