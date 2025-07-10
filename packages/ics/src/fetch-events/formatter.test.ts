import { describe, it, expect } from 'vitest'

import { formatEventsResponse, formatEventsError } from './formatter.js'

describe('formatEventsResponse', () => {
  it('should format results for non-recurring events', () => {
    const input = {
      events: [
        {
          uid: '1',
          summary: 'Test',
          dtstart: new Date('2024-06-01T09:00'),
          allDay: false,
          source: 'A',
        },
      ],
      totalSources: 1,
      errors: [],
      recurringCount: 0,
      expandedCount: 0,
      startDate: '2024-06-01',
      endDate: '2024-06-02',
      limit: 1,
    }
    const out = formatEventsResponse(input)
    expect(out).toContain('Calendar Events (1 found from 1 source')
    expect(out).toContain('Test')
    expect(out).toContain('A')
  })
  it('should mention recurring and errors', () => {
    const input = {
      events: [
        {
          uid: '1',
          summary: 'A',
          dtstart: new Date(),
          allDay: false,
          source: 'S',
        },
      ],
      totalSources: 1,
      errors: ['fail1', 'fail2'],
      recurringCount: 2,
      expandedCount: 4,
      startDate: 'x',
      endDate: 'y',
      limit: 1,
    }
    const out = formatEventsResponse(input)
    expect(out).toContain('Recurring events')
    expect(out).toContain('fail1')
    expect(out).toContain('fail2')
  })
  it('should not crash on events without dtend, desc, or location', () => {
    const input = {
      events: [{ uid: '2', summary: 'None', dtstart: new Date(), allDay: true, source: 'S2' }],
      totalSources: 1,
      errors: [],
      recurringCount: 0,
      expandedCount: 0,
      startDate: '',
      endDate: '',
      limit: 1,
    }
    expect(() => formatEventsResponse(input)).not.toThrow()
  })
})

describe('formatEventsError', () => {
  it('should format error messages', () => {
    expect(formatEventsError(new Error('bad'))).toContain('bad')
    expect(formatEventsError('oops')).toContain('oops')
  })
})
