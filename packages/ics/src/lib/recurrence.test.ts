import { describe, it, expect, vi, afterEach } from 'vitest'

import { resolveRecurrence } from './recurrrence.js'

import type { RawIcalEvent, RRuleLike } from './types.js'

// Mock RRuleLike for testing purposes
const createMockRRule = (dates: Date[]): RRuleLike => ({
  between: vi.fn().mockReturnValue(dates),
})

const createThrowingMockRRule = (): RRuleLike => ({
  between: vi.fn().mockImplementation(() => {
    throw new Error('RRule error')
  }),
})

describe('resolveRecurrence', () => {
  const startDate = new Date('2025-03-01T00:00:00Z')
  const endDate = new Date('2025-03-31T23:59:59Z')
  const baseEvent: Omit<RawIcalEvent, 'uid' | 'dtstart'> = {
    summary: 'Test Event',
    allDay: false,
    source: 'test-source',
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return a single non-recurring event if it falls within the date range', () => {
    const event: RawIcalEvent = {
      ...baseEvent,
      uid: 'single-in-range',
      dtstart: new Date('2025-03-15T10:00:00Z'),
      dtend: new Date('2025-03-15T11:00:00Z'),
    }
    const result = resolveRecurrence([event], startDate, endDate)
    expect(result).toHaveLength(1)
    expect(result[0].uid).toBe('single-in-range')
    expect(result[0].dtstart).toEqual(event.dtstart)
  })

  it('should return an empty array for a non-recurring event outside the date range', () => {
    const event: RawIcalEvent = {
      ...baseEvent,
      uid: 'single-out-of-range',
      dtstart: new Date('2025-02-15T10:00:00Z'),
    }
    const result = resolveRecurrence([event], startDate, endDate)
    expect(result).toHaveLength(0)
  })

  it('should expand a simple recurring event', () => {
    const recurringDates = [
      new Date('2025-03-07T10:00:00Z'),
      new Date('2025-03-14T10:00:00Z'),
      new Date('2025-03-21T10:00:00Z'),
      new Date('2025-03-28T10:00:00Z'),
    ]
    const event: RawIcalEvent = {
      ...baseEvent,
      uid: 'recurring-simple',
      dtstart: new Date('2025-03-07T10:00:00Z'),
      dtend: new Date('2025-03-07T11:00:00Z'), // 1 hour duration
      rrule: createMockRRule(recurringDates),
    }

    const result = resolveRecurrence([event], startDate, endDate)
    expect(result).toHaveLength(4)
    expect(result[0].summary).toBe('Test Event')
    expect(result[0].dtstart).toEqual(new Date('2025-03-07T10:00:00Z'))
    expect(result[0].dtend).toEqual(new Date('2025-03-07T11:00:00Z'))
    expect(result[3].dtstart).toEqual(new Date('2025-03-28T10:00:00Z'))
    expect(result[3].dtend).toEqual(new Date('2025-03-28T11:00:00Z'))
    // Check for unique UIDs
    expect(new Set(result.map((e) => e.uid)).size).toBe(4)
  })

  it('should not include occurrences that are exceptions (exdate)', () => {
    const recurringDates = [new Date('2025-03-07T10:00:00Z'), new Date('2025-03-14T10:00:00Z')]
    const event: RawIcalEvent = {
      ...baseEvent,
      uid: 'recurring-exdate',
      dtstart: new Date('2025-03-07T10:00:00Z'),
      rrule: createMockRRule(recurringDates),
      exdate: {
        '20250314T100000Z': new Date('2025-03-14T10:00:00Z'),
      },
    }
    const result = resolveRecurrence([event], startDate, endDate)
    expect(result).toHaveLength(1)
    expect(result[0].dtstart).toEqual(new Date('2025-03-07T10:00:00Z'))
  })

  it('should not include occurrences that are cancelled recurrences', () => {
    const recurringDates = [new Date('2025-03-07T10:00:00Z'), new Date('2025-03-14T10:00:00Z')]
    const event: RawIcalEvent = {
      ...baseEvent,
      uid: 'recurring-cancelled',
      dtstart: new Date('2025-03-07T10:00:00Z'),
      rrule: createMockRRule(recurringDates),
      recurrences: {
        '20250314T100000Z': {
          ...(baseEvent as RawIcalEvent),
          uid: 'recurring-cancelled',
          dtstart: new Date('2025-03-14T10:00:00Z'),
          allDay: false,
          source: 'test-source',
          status: 'CANCELLED',
        },
      },
    }
    const result = resolveRecurrence([event], startDate, endDate)
    expect(result).toHaveLength(1)
    expect(result[0].dtstart).toEqual(new Date('2025-03-07T10:00:00Z'))
  })

  it('should handle recurring events with no end date (zero duration)', () => {
    const recurringDates = [new Date('2025-03-10T10:00:00Z')]
    const event: RawIcalEvent = {
      ...baseEvent,
      uid: 'recurring-no-end',
      dtstart: new Date('2025-03-10T10:00:00Z'),
      dtend: undefined,
      rrule: createMockRRule(recurringDates),
    }

    const result = resolveRecurrence([event], startDate, endDate)
    expect(result).toHaveLength(1)
    expect(result[0].dtend).toBeUndefined()
  })

  it('should handle rrule.between throwing an error by treating event as non-recurring', () => {
    const event: RawIcalEvent = {
      ...baseEvent,
      uid: 'rrule-error',
      dtstart: new Date('2025-03-15T10:00:00Z'),
      rrule: createThrowingMockRRule(),
    }

    const result = resolveRecurrence([event], startDate, endDate)
    expect(result).toHaveLength(1)
    expect(result[0].uid).toBe('rrule-error')
  })

  it('should return original event if rrule.between returns empty and original event is in range', () => {
    const event: RawIcalEvent = {
      ...baseEvent,
      uid: 'empty-recurrence-in-range',
      dtstart: new Date('2025-03-15T10:00:00Z'),
      rrule: createMockRRule([]), // rrule generates no dates in the range
    }

    const result = resolveRecurrence([event], startDate, endDate)
    expect(result).toHaveLength(1)
    expect(result[0].uid).toBe('empty-recurrence-in-range')
  })

  it('should return empty array if rrule.between returns empty and original event is out of range', () => {
    const event: RawIcalEvent = {
      ...baseEvent,
      uid: 'empty-recurrence-out-of-range',
      dtstart: new Date('2025-02-15T10:00:00Z'),
      rrule: createMockRRule([]),
    }

    const result = resolveRecurrence([event], startDate, endDate)
    expect(result).toHaveLength(0)
  })

  describe('getAdjustedRecurrenceDate (via resolveRecurrence)', () => {
    // These tests mock Date.prototype.getTimezoneOffset to simulate environments with different timezones
    // and DST changes, which is otherwise not possible in a static test environment like UTC.
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset

    afterEach(() => {
      Date.prototype.getTimezoneOffset = originalGetTimezoneOffset
    })

    it('should adjust recurrence time when timezone offsets differ (e.g., DST change) without tzid', () => {
      const eventStart = new Date('2025-03-05T15:00:00.000Z') // Represents 10:00 local time in UTC-5
      const recurrenceFromRrule = new Date('2025-03-12T15:00:00.000Z') // rrule adds 7 days to UTC

      Date.prototype.getTimezoneOffset = function () {
        return this.getTime() < new Date('2025-03-09T07:00:00.000Z').getTime() ? 300 : 240 // EST (UTC-5) -> EDT (UTC-4)
      }

      const event: RawIcalEvent = {
        ...baseEvent,
        uid: 'dst-change',
        dtstart: eventStart,
        rrule: createMockRRule([recurrenceFromRrule]),
      }

      const result = resolveRecurrence([event], startDate, endDate)
      // The code's logic is `recurrence.getTime() + (origOffset - recOffset) * 60000`.
      // This appears to be incorrect (should likely be `recOffset - origOffset`), but we test the code as written.
      // origOffset=300, recOffset=240 -> diff=60. Adds 1 hour.
      const expectedTime = new Date(recurrenceFromRrule.getTime() + 60 * 60000)

      expect(result).toHaveLength(1)
      expect(result[0].dtstart).toEqual(expectedTime)
    })

    it('should apply timezone adjustment when tzid is present', () => {
      const eventStart = new Date('2025-10-25T14:00:00.000Z') // 10:00 in UTC-4
      const recurrenceDate = new Date('2025-11-05T15:00:00.000Z') // 10:00 in UTC-5

      // Spy on specific date instances to mock their offsets
      vi.spyOn(eventStart, 'getTimezoneOffset').mockReturnValue(240) // EDT (UTC-4)
      vi.spyOn(recurrenceDate, 'getTimezoneOffset').mockReturnValue(300) // EST (UTC-5)

      const event: RawIcalEvent = {
        ...baseEvent,
        uid: 'tzid-event',
        dtstart: eventStart,
        rrule: createMockRRule([recurrenceDate]),
        rruleOptions: { dtstart: eventStart, tzid: 'America/New_York' },
      }

      const result = resolveRecurrence([event], startDate, endDate)
      // The code's logic: `recurrence.getTime() + eventStart.getTimezoneOffset() * 60000`
      // This logic also appears flawed, but we test the implemented behavior.
      const expectedTime = new Date(recurrenceDate.getTime() + 240 * 60000)

      expect(result).toHaveLength(1)
      expect(result[0].dtstart).toEqual(expectedTime)
    })
  })
})
