import { describe, it, expect, vi } from 'vitest'

import * as formatter from './formatter.js'
import { toolHandler } from './handler.js'
import * as helper from './helper.js'

const mockResult = {
  events: [
    {
      uid: 'e1',
      summary: 'Event',
      dtstart: new Date(),
      source: 's',
      allDay: false,
    },
  ],
  totalSources: 1,
  errors: [],
  recurringCount: 0,
  expandedCount: 0,
  startDate: '2024-01-01',
  endDate: '2024-01-02',
  limit: 1,
}

describe('toolHandler', () => {
  it('should return formatted success', async () => {
    vi.spyOn(helper, 'fetchCalendarEvents').mockResolvedValue(mockResult)
    vi.spyOn(formatter, 'formatEventsResponse').mockReturnValue('Formatted!')
    const params = { startDate: '2024-01-01', endDate: '2024-01-02', limit: 1 }
    const res = await toolHandler(params)
    expect(res.content?.[0]?.text).toBe('Formatted!')
    expect(res.content?.[0]?._meta?.stderr).toBe('')
  })

  it('should return formatted error', async () => {
    vi.spyOn(helper, 'fetchCalendarEvents').mockRejectedValue(new Error('fail!'))
    vi.spyOn(formatter, 'formatEventsError').mockReturnValue('ERR!')
    const params = { startDate: '2024-01-01', endDate: '2024-01-02', limit: 1 }
    const res = await toolHandler(params)
    expect(res.content?.[0]?.text).toBe('ERR!')
    expect(res.content?.[0]?._meta?.stderr).toContain('fail')
  })
})
