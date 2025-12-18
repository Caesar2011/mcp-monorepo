import { describe, it, expect } from 'vitest'

import { filterEvents } from './filter-events.js'

import type { CalendarEvent } from './types.js'

describe('filterEvents', () => {
  const startRange = new Date('2025-01-10T00:00:00Z')
  const endRange = new Date('2025-01-20T23:59:59Z')

  const createEvent = (id: string, start: string, end?: string): CalendarEvent => ({
    uid: id,
    summary: `Event ${id}`,
    dtstart: new Date(start),
    dtend: end ? new Date(end) : undefined,
    allDay: false,
    source: 'test',
  })

  const events: CalendarEvent[] = [
    createEvent('1-before', '2025-01-01T10:00:00Z', '2025-01-01T11:00:00Z'), // completely before
    createEvent('2-overlap-start', '2025-01-09T10:00:00Z', '2025-01-10T11:00:00Z'), // overlaps start
    createEvent('3-inside', '2025-01-15T10:00:00Z', '2025-01-15T11:00:00Z'), // completely inside
    createEvent('4-overlap-end', '2025-01-20T10:00:00Z', '2025-01-21T11:00:00Z'), // overlaps end
    createEvent('5-after', '2025-02-01T10:00:00Z', '2025-02-01T11:00:00Z'), // completely after
    createEvent('6-encompass', '2025-01-01T10:00:00Z', '2025-02-01T11:00:00Z'), // encompasses range
    createEvent('7-no-end', '2025-01-12T10:00:00Z'), // inside, no dtend
    createEvent('8-no-end-outside', '2025-01-01T10:00:00Z'), // outside, no dtend
    createEvent('9-touch-start', '2025-01-10T00:00:00Z', '2025-01-10T01:00:00Z'), // starts exactly at range start
    createEvent('10-touch-end', '2025-01-20T22:59:59Z', '2025-01-20T23:59:59Z'), // ends exactly at range end
  ]

  it('should return events that are within or overlap the given date range', () => {
    const filtered = filterEvents(events, startRange, endRange)
    const filteredIds = filtered.map((e) => e.uid)

    expect(filteredIds).toContain('2-overlap-start')
    expect(filteredIds).toContain('3-inside')
    expect(filteredIds).toContain('4-overlap-end')
    expect(filteredIds).toContain('6-encompass')
    expect(filteredIds).toContain('7-no-end')
    expect(filteredIds).toContain('9-touch-start')
    expect(filteredIds).toContain('10-touch-end')

    expect(filteredIds).not.toContain('1-before')
    expect(filteredIds).not.toContain('5-after')
    expect(filteredIds).not.toContain('8-no-end-outside')

    expect(filteredIds).toHaveLength(7)
  })

  it('should sort the events by start date', () => {
    // Add events in a jumbled order
    const jumbledEvents: CalendarEvent[] = [
      createEvent('c', '2025-01-15T12:00:00Z'),
      createEvent('a', '2025-01-11T10:00:00Z'),
      createEvent('b', '2025-01-12T11:00:00Z'),
    ]
    const filtered = filterEvents(jumbledEvents, startRange, endRange)
    const filteredIds = filtered.map((e) => e.uid)
    expect(filteredIds).toEqual(['a', 'b', 'c'])
  })

  it('should return an empty array if no events match', () => {
    const noMatchEvents: CalendarEvent[] = [
      createEvent('1', '2024-01-01T10:00:00Z'),
      createEvent('2', '2026-01-01T10:00:00Z'),
    ]
    const filtered = filterEvents(noMatchEvents, startRange, endRange)
    expect(filtered).toEqual([])
  })

  it('should return an empty array for empty input', () => {
    const filtered = filterEvents([], startRange, endRange)
    expect(filtered).toEqual([])
  })

  it('should handle events where dtend is the same as dtstart', () => {
    const event = createEvent('instant', '2025-01-15T12:00:00Z', '2025-01-15T12:00:00Z')
    const filtered = filterEvents([event], startRange, endRange)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].uid).toBe('instant')
  })

  it('should handle an event that ends exactly on the start of the range', () => {
    // st <= end (true) && en >= start (true) -> should be included
    const event = createEvent('ends-on-start', '2025-01-09T23:00:00Z', '2025-01-10T00:00:00Z')
    const filtered = filterEvents([event], startRange, endRange)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].uid).toBe('ends-on-start')
  })

  it('should handle an event that starts exactly on the end of the range', () => {
    // st <= end (true) && en >= start (true) -> should be included
    const event = createEvent('starts-on-end', '2025-01-20T23:59:59Z', '2025-01-21T00:00:00Z')
    const filtered = filterEvents([event], startRange, endRange)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].uid).toBe('starts-on-end')
  })
})
