import ical, { type VEvent } from 'node-ical'

import type { FetchEventsParams, CalendarEvent, FetchEventsResult } from './types.js'

interface RRuleLike {
  between: (start: Date, end: Date) => Date[]
  origOptions?: { tzid?: string; dtstart: Date; [key: string]: unknown }
}

interface RawIcalEvent {
  uid: string
  summary: string
  description?: string
  location?: string
  dtstart: Date
  dtend?: Date
  allDay: boolean
  source: string
  rrule?: RRuleLike
  rruleOptions?: { tzid?: string; dtstart: Date }
}

export interface CalendarSource {
  name: string
  url: string
}

export const getIcsUrls = (): CalendarSource[] => {
  const args = process.argv.slice(2)
  if (args.length === 0) throw new Error('No ICS URLs provided as process arguments.')
  return args.map((arg, i) => {
    let name, url
    if (arg.includes('=')) {
      const [prefix, ...rest] = arg.split('=')
      name = prefix
      url = rest.join('=')
    } else {
      name = `Calendar ${i + 1}`
      url = arg
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) throw new Error(`Invalid URL: ${url}`)
    return { name, url }
  })
}

export const parseIcsContent = async (icsContent: string, source: string): Promise<RawIcalEvent[]> => {
  const entries = Object.values(await ical.async.parseICS(icsContent))
  return entries
    .filter((e) => e.type === 'VEVENT')
    .map((event: VEvent) => {
      return {
        uid: event.uid,
        summary: event.summary,
        description: event.description,
        location: event.location,
        dtstart: event.start,
        dtend: event.end,
        allDay: event.datetype === 'date',
        source,
        rrule: event.rrule as RRuleLike | undefined,
        rruleOptions: event.rrule ? (event.rrule as RRuleLike).origOptions : undefined,
      }
    })
}

function getAdjustedRecurrenceDate(
  rruleOrigOptions: { tzid?: string; dtstart: Date } | undefined,
  eventStart: Date,
  recurrence: Date,
): Date {
  if (rruleOrigOptions && rruleOrigOptions.tzid) {
    try {
      const utc = recurrence.getTime() + eventStart.getTimezoneOffset() * 60000
      return new Date(utc)
    } catch {
      return recurrence
    }
  }
  const origOffset = eventStart.getTimezoneOffset()
  const recOffset = recurrence.getTimezoneOffset()
  const offsetDiff = origOffset - recOffset
  return new Date(recurrence.getTime() + offsetDiff * 60000)
}

export function expandRecurringEvents(events: RawIcalEvent[], startDate: Date, endDate: Date): CalendarEvent[] {
  const expanded: CalendarEvent[] = []
  for (const event of events) {
    if (!event.rrule) {
      expanded.push({
        uid: event.uid,
        summary: event.summary,
        description: event.description,
        location: event.location,
        dtstart: event.dtstart,
        dtend: event.dtend,
        allDay: !!event.allDay,
        source: event.source,
      })
      continue
    }
    try {
      const recurrences: Date[] = event.rrule.between(startDate, endDate)
      if (recurrences.length === 0) {
        if (event.dtstart >= startDate && event.dtstart <= endDate) {
          expanded.push({
            uid: event.uid,
            summary: event.summary,
            description: event.description,
            location: event.location,
            dtstart: event.dtstart,
            dtend: event.dtend,
            allDay: !!event.allDay,
            source: event.source,
          })
        }
        continue
      }
      for (const recurrenceDate of recurrences) {
        const adjustedStart = getAdjustedRecurrenceDate(event.rruleOptions, event.dtstart, recurrenceDate)
        const duration = event.dtend && event.dtstart ? event.dtend.getTime() - event.dtstart.getTime() : 0
        expanded.push({
          uid: `${event.uid}_${adjustedStart.getTime()}`,
          summary: event.summary,
          description: event.description,
          location: event.location,
          dtstart: adjustedStart,
          dtend: duration ? new Date(adjustedStart.getTime() + duration) : undefined,
          allDay: !!event.allDay,
          source: event.source,
        })
      }
    } catch {
      expanded.push({
        uid: event.uid,
        summary: event.summary,
        description: event.description,
        location: event.location,
        dtstart: event.dtstart,
        dtend: event.dtend,
        allDay: !!event.allDay,
        source: event.source,
      })
    }
  }
  return expanded
}

export async function fetchCalendarEvents(params: FetchEventsParams): Promise<FetchEventsResult> {
  const sources = getIcsUrls()
  const start = new Date(params.startDate + 'T00:00:00')
  const end = new Date(params.endDate + 'T23:59:59')
  if (start > end) throw new Error('Error: Start date must be before end date')

  const allEvents: RawIcalEvent[] = []
  const errors: string[] = []

  for (const source of sources) {
    try {
      const icsContent = await fetch(source.url)
      if (!(icsContent && icsContent.ok)) throw new Error(`Fetch failed for ${source.url}`)
      const text = await icsContent.text()
      const events = await parseIcsContent(text, source.name)
      allEvents.push(...events)
    } catch (e) {
      errors.push(`${source.name}: ${(e as Error).message}`)
    }
  }

  const expandedEvents = expandRecurringEvents(allEvents, start, end)
  const filtered = expandedEvents
    .filter((evt) => {
      const st = evt.dtstart,
        en = evt.dtend || evt.dtstart
      return st <= end && en >= start
    })
    .sort((a, b) => a.dtstart.getTime() - b.dtstart.getTime())
    .slice(0, params.limit || 50)

  const recurringCount = allEvents.filter((e) => e.rrule).length
  const expandedCount = expandedEvents.length - (allEvents.length - recurringCount)

  return {
    events: filtered,
    totalSources: sources.length,
    errors,
    recurringCount,
    expandedCount,
    startDate: params.startDate,
    endDate: params.endDate,
    limit: params.limit || 50,
  }
}

export function formatDate(date: Date, allDay = false): string {
  if (allDay) {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
