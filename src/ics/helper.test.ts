import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarEvent, expandRecurringEvents, parseIcsContent } from './helper.js'
import ical, { CalendarResponse, VEvent } from 'node-ical'
import { Frequency } from 'rrule'

// Mock node-ical
vi.mock('node-ical', () => ({
  default: {
    async: {
      parseICS: vi.fn(),
    },
  },
}))

describe('ICS Helper - Recurrence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('expandRecurringEvents', () => {
    it('should return non-recurring events unchanged', () => {
      const events: CalendarEvent[] = [
        {
          uid: 'test-1',
          summary: 'Non-recurring event',
          description: 'Test description',
          location: 'Test location',
          dtstart: new Date('2024-01-01T10:00:00'),
          dtend: new Date('2024-01-01T11:00:00'),
          allDay: false,
          source: 'Test Calendar',
          rrule: null,
          isRecurring: false,
        },
      ]

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      const result = expandRecurringEvents(events, startDate, endDate)
      expect(result).toEqual(events)
    })

    it('should expand recurring events with valid RRule', () => {
      const mockRRule = {
        between: vi
          .fn()
          .mockReturnValue([
            new Date('2024-01-08T10:00:00'),
            new Date('2024-01-15T10:00:00'),
            new Date('2024-01-22T10:00:00'),
          ]),
        origOptions: {
          dtstart: new Date('2024-01-01T10:00:00'),
          freq: 'WEEKLY',
        },
      }

      const recurringEvent: CalendarEvent = {
        uid: 'recurring-1',
        summary: 'Weekly Meeting',
        description: 'Recurring meeting',
        location: 'Conference Room',
        dtstart: new Date('2024-01-01T10:00:00'),
        dtend: new Date('2024-01-01T11:00:00'),
        allDay: false,
        source: 'Work Calendar',
        rrule: { rrule: mockRRule },
        isRecurring: true,
      }

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      const result = expandRecurringEvents([recurringEvent], startDate, endDate)

      expect(mockRRule.between).toHaveBeenCalledWith(startDate, endDate)
      expect(result).toHaveLength(3)

      // Check that each expanded event has correct properties
      result.forEach((event) => {
        expect(event.summary).toBe('Weekly Meeting')
        expect(event.isRecurring).toBe(false)
        expect(event.rrule).toBe(null)
        expect(event.uid).toContain('recurring-1_')

        // Check that duration is preserved (1 hour)
        const duration = event.dtend.getTime() - event.dtstart.getTime()
        expect(duration).toBe(60 * 60 * 1000) // 1 hour in milliseconds
      })
    })

    it('should handle recurring events with no recurrences in range', () => {
      const mockRRule = {
        between: vi.fn().mockReturnValue([]),
        origOptions: {
          dtstart: new Date('2024-01-01T10:00:00'),
          freq: 'WEEKLY',
        },
      }

      const recurringEvent: CalendarEvent = {
        uid: 'recurring-2',
        summary: 'Future Meeting',
        description: 'Meeting in future',
        location: 'Online',
        dtstart: new Date('2024-06-01T10:00:00'),
        dtend: new Date('2024-06-01T11:00:00'),
        allDay: false,
        source: 'Work Calendar',
        rrule: { rrule: mockRRule },
        isRecurring: true,
      }

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      const result = expandRecurringEvents([recurringEvent], startDate, endDate)

      expect(mockRRule.between).toHaveBeenCalledWith(startDate, endDate)
      expect(result).toHaveLength(0) // No events in range
    })

    it('should include original event if it falls in range when no recurrences', () => {
      const mockRRule = {
        between: vi.fn().mockReturnValue([]),
        origOptions: {
          dtstart: new Date('2024-01-15T10:00:00'),
          freq: 'WEEKLY',
        },
      }

      const recurringEvent: CalendarEvent = {
        uid: 'recurring-3',
        summary: 'Original Event',
        description: 'Original occurrence',
        location: 'Office',
        dtstart: new Date('2024-01-15T10:00:00'),
        dtend: new Date('2024-01-15T11:00:00'),
        allDay: false,
        source: 'Work Calendar',
        rrule: { rrule: mockRRule },
        isRecurring: true,
      }

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      const result = expandRecurringEvents([recurringEvent], startDate, endDate)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(recurringEvent)
    })

    it('should handle RRule errors gracefully', () => {
      const mockRRule = {
        between: vi.fn().mockImplementation(() => {
          throw new Error('RRule processing failed')
        }),
        origOptions: {
          dtstart: new Date('2024-01-01T10:00:00'),
          freq: 'WEEKLY',
        },
      }

      const recurringEvent: CalendarEvent = {
        uid: 'recurring-4',
        summary: 'Problematic Event',
        description: 'Event with RRule issues',
        location: 'Unknown',
        dtstart: new Date('2024-01-01T10:00:00'),
        dtend: new Date('2024-01-01T11:00:00'),
        allDay: false,
        source: 'Test Calendar',
        rrule: { rrule: mockRRule },
        isRecurring: true,
      }

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      const result = expandRecurringEvents([recurringEvent], startDate, endDate)

      // Should fall back to original event
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(recurringEvent)
    })
  })

  describe('parseIcsContent', () => {
    it('should correctly identify recurring events', async () => {
      const mockParsedData = {
        event1: {
          type: 'VEVENT',
          uid: 'event-1',
          summary: 'Regular Event',
          description: 'Non-recurring event',
          location: 'Office',
          start: Object.assign(new Date('2024-01-01T10:00:00'), { tz: 'Europe/London' }),
          end: Object.assign(new Date('2024-01-01T11:00:00'), { tz: 'Europe/London' }),
          datetype: 'date-time',
        } as VEvent,
        event2: {
          type: 'VEVENT',
          uid: 'event-2',
          summary: 'Recurring Event',
          description: 'Weekly meeting',
          location: 'Conference Room',
          start: Object.assign(new Date('2024-01-01T14:00:00'), { tz: 'Europe/London' }),
          end: Object.assign(new Date('2024-01-01T15:00:00'), { tz: 'Europe/London' }),
          datetype: 'date-time',
          rrule: {
            between: vi.fn(),
            origOptions: { freq: Frequency.WEEKLY },
          } as unknown as VEvent['rrule'],
        } as VEvent,
      } satisfies CalendarResponse

      vi.mocked(ical.async.parseICS).mockResolvedValue(mockParsedData)

      const result = await parseIcsContent('fake-ics-content', 'Test Calendar')

      expect(result).toHaveLength(2)

      // First event should not be recurring
      expect(result?.[0]?.isRecurring).toBe(false)
      expect(result?.[0]?.rrule).toBe(null)

      // Second event should be recurring
      expect(result?.[1]?.isRecurring).toBe(true)
      expect(result?.[1]?.rrule).toBe(mockParsedData.event2)
    })

    it('should handle all-day events correctly', async () => {
      const mockParsedData = {
        'allday-event': {
          type: 'VEVENT',
          uid: 'allday-1',
          summary: 'All Day Event',
          description: 'Full day event',
          location: '',
          start: Object.assign(new Date('2024-01-01'), { tz: 'Europe/London' }),
          end: Object.assign(new Date('2024-01-01'), { tz: 'Europe/London' }),
          datetype: 'date',
        } as VEvent,
      } satisfies CalendarResponse

      vi.mocked(ical.async.parseICS).mockResolvedValue(mockParsedData)

      const result = await parseIcsContent('fake-ics-content', 'Test Calendar')

      expect(result).toHaveLength(1)
      expect(result?.[0]?.allDay).toBe(true)
    })
  })
})
