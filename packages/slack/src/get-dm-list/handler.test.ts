import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatDmList, formatError } from './formatter.js'
import { getDmListHandler } from './handler.js'
import { fetchDmList } from './helper.js'

vi.mock('./helper.js', () => ({
  fetchDmList: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatDmList: vi.fn(),
  formatError: vi.fn(),
}))

describe('getDmListHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return formatted dm list data on success', async () => {
    const mockList = [
      {
        type: 'im',
        channelId: 'D123',
        userId: 'U456',
        userRealName: 'Alice',
        userSlackName: 'alice',
        lastMessage: { text: 'Hi', ts: '1', userId: 'U456' },
      },
    ]
    const formatted = 'DM with Alice | Last: Hi'
    vi.mocked(fetchDmList).mockResolvedValue(mockList)
    vi.mocked(formatDmList).mockReturnValue(formatted)
    const result = await getDmListHandler()
    expect(fetchDmList).toHaveBeenCalled()
    expect(formatDmList).toHaveBeenCalledWith(mockList)
    expect(result).toEqual({ content: [{ type: 'text', text: formatted }] })
  })

  it('should handle errors and format them', async () => {
    const error = new Error('fail')
    const msg = 'Error getting Slack DM list: fail'
    vi.mocked(fetchDmList).mockRejectedValue(error)
    vi.mocked(formatError).mockReturnValue(msg)
    const result = await getDmListHandler()
    expect(formatError).toHaveBeenCalledWith(error)
    expect(result).toEqual({ content: [{ type: 'text', text: msg, _meta: { stderr: 'fail' } }] })
  })
})

