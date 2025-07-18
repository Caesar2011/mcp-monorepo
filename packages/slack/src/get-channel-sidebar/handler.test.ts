import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatChannelSidebar, formatError } from './formatter.js'
import { getChannelSidebarHandler } from './handler.js'
import {fetchChannelSectionsAndList} from "./helper";

vi.mock('./helper.js', () => ({
  fetchChannelSectionsAndList: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatChannelSidebar: vi.fn(),
  formatError: vi.fn(),
}))


describe('getChannelSidebarHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return formatted sidebar data on success', async () => {
    const mockSections = [
      {
        id: 's1',
        name: 'Section 1',
        type: 'channels',
        emoji: '',
        channels: [
          {
            id: 'c1',
            name: 'chan',
            topic: '',
            purpose: '',
            is_member: true,
            is_private: false,
            is_im: false,
            is_mpim: false,
          },
        ],
      },
    ]
    const formatted = 'Section: Section 1\n - #chan (c1)'
    vi.mocked(fetchChannelSectionsAndList).mockResolvedValue(mockSections)
    vi.mocked(formatChannelSidebar).mockReturnValue(formatted)
    const result = await getChannelSidebarHandler()
    expect(fetchChannelSectionsAndList).toHaveBeenCalled()
    expect(formatChannelSidebar).toHaveBeenCalledWith(mockSections)
    expect(result).toEqual({ content: [{ type: 'text', text: formatted }] })
  })

  it('should handle errors and format them', async () => {
    const error = new Error('fail')
    const msg = 'Error getting Slack channel sidebar: fail'
    const { fetchChannelSectionsAndList } = await import('./helper.js')
    vi.mocked(fetchChannelSectionsAndList).mockRejectedValue(error)
    vi.mocked(formatError).mockReturnValue(msg)
    const result = await getChannelSidebarHandler()
    expect(formatError).toHaveBeenCalledWith(error)
    expect(result).toEqual({ content: [{ type: 'text', text: msg, _meta: { stderr: 'fail' } }] })
  })
})
