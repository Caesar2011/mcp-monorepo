import { beforeEach, describe, expect, it, vi } from 'vitest'

import { expandRecurringEvents } from './helper.js'

// Test utility for public CalendarEvent shape (no rrule, isRecurring, etc)
function minimalEvent(partial) {
  return {
    uid: partial.uid,
    summary: partial.summary,
    description: partial.description,
    location: partial.location,
    dtstart: partial.dtstart,
    dtend: partial.dtend,
    allDay: partial.allDay,
    source: partial.source,
  }
}

describe('ICS Helper - Recurrence (public shape)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return non-recurring events unchanged', () => {
    const events = [
      {
        uid: 'test-1',
        summary: 'Non-recurring event',
        description: 'Test description',
        location: 'Test location',
        dtstart: new Date('2024-01-01T10:00:00'),
        dtend: new Date('2024-01-01T11:00:00'),
        allDay: false,
        source: 'Test Calendar',
      },
    ]
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-01-31')
    const result = expandRecurringEvents(events, startDate, endDate)
    expect(result.map(minimalEvent)).toEqual(events.map(minimalEvent))
  })

  it('should expand recurring events with valid RRule', () => {
    const mockBetween = vi
      .fn()
      .mockReturnValue([
        new Date('2024-01-08T10:00:00'),
        new Date('2024-01-15T10:00:00'),
        new Date('2024-01-22T10:00:00'),
      ])
    const baseEvent = {
      uid: 'recurring-1',
      summary: 'Weekly Meeting',
      description: 'Recurring meeting',
      location: 'Conference Room',
      dtstart: new Date('2024-01-01T10:00:00'),
      dtend: new Date('2024-01-01T11:00:00'),
      allDay: false,
      source: 'Work Calendar',
      rrule: {
        between: mockBetween,
        origOptions: { dtstart: new Date('2024-01-01T10:00:00'), freq: 'WEEKLY' },
      },
      rruleOptions: { dtstart: new Date('2024-01-01T10:00:00'), freq: 'WEEKLY' },
    }
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-01-31')
    const result = expandRecurringEvents([baseEvent], startDate, endDate)
    expect(mockBetween).toHaveBeenCalledWith(startDate, endDate)
    expect(result).toHaveLength(3)
    result.forEach((event) => {
      expect(event.summary).toBe('Weekly Meeting')
      expect(event.uid.startsWith('recurring-1_')).toBeTruthy()
      const duration = event.dtend.getTime() - event.dtstart.getTime()
      expect(duration).toBe(60 * 60 * 1000)
      expect(event.source).toBe('Work Calendar')
    })
  })

  it('should handle recurring events with no recurrences in range', () => {
    const mockBetween = vi.fn().mockReturnValue([])
    const baseEvent = {
      uid: 'recurring-2',
      summary: 'Future Meeting',
      description: 'Meeting in future',
      location: 'Online',
      dtstart: new Date('2024-06-01T10:00:00'),
      dtend: new Date('2024-06-01T11:00:00'),
      allDay: false,
      source: 'Work Calendar',
      rrule: {
        between: mockBetween,
        origOptions: { dtstart: new Date('2024-06-01T10:00:00'), freq: 'WEEKLY' },
      },
      rruleOptions: { dtstart: new Date('2024-06-01T10:00:00'), freq: 'WEEKLY' },
    }
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-01-31')
    const result = expandRecurringEvents([baseEvent], startDate, endDate)
    expect(mockBetween).toHaveBeenCalledWith(startDate, endDate)
    expect(result).toHaveLength(0)
  })

  it('should include original event if it falls in range when no recurrences', () => {
    const mockBetween = vi.fn().mockReturnValue([])
    const baseEvent = {
      uid: 'recurring-3',
      summary: 'Original Event',
      description: 'Original occurrence',
      location: 'Office',
      dtstart: new Date('2024-01-15T10:00:00'),
      dtend: new Date('2024-01-15T11:00:00'),
      allDay: false,
      source: 'Work Calendar',
      rrule: {
        between: mockBetween,
        origOptions: { dtstart: new Date('2024-01-15T10:00:00'), freq: 'WEEKLY' },
      },
      rruleOptions: { dtstart: new Date('2024-01-15T10:00:00'), freq: 'WEEKLY' },
    }
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-01-31')
    const result = expandRecurringEvents([baseEvent], startDate, endDate)
    expect(result).toHaveLength(1)
    expect(minimalEvent(result[0])).toEqual(minimalEvent({ ...baseEvent }))
  })

  it('should handle RRule errors gracefully', () => {
    const mockBetween = vi.fn().mockImplementation(() => {
      throw new Error('RRule processing failed')
    })
    const baseEvent = {
      uid: 'recurring-4',
      summary: 'Problematic Event',
      description: 'Event with RRule issues',
      location: 'Unknown',
      dtstart: new Date('2024-01-01T10:00:00'),
      dtend: new Date('2024-01-01T11:00:00'),
      allDay: false,
      source: 'Test Calendar',
      rrule: {
        between: mockBetween,
        origOptions: { dtstart: new Date('2024-01-01T10:00:00'), freq: 'WEEKLY' },
      },
      rruleOptions: { dtstart: new Date('2024-01-01T10:00:00'), freq: 'WEEKLY' },
    }
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-01-31')
    const result = expandRecurringEvents([baseEvent], startDate, endDate)
    expect(result).toHaveLength(1)
    expect(minimalEvent(result[0])).toEqual(minimalEvent({ ...baseEvent }))
  })
})
