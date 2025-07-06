import ical from 'node-ical'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

interface CalendarSource {
  name: string
  url: string
}

export const getIcsUrls = (): CalendarSource[] => {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error(
      'Error: No ICS URLs provided as arguments. Usage: ts-node src/helper.ts [<name>=]<url> [<name>=]<url> ...',
    )
    process.exit(1)
  }

  const sources: CalendarSource[] = []

  for (const arg of args) {
    let name: string
    let url: string

    if (arg.includes('=')) {
      const [prefix, ...urlParts] = arg.split('=')
      name = prefix as string
      url = urlParts.join('=')
    } else {
      url = arg
      name = `Calendar ${sources.length + 1}`
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      console.error(`Error: Only HTTP/HTTPS URLs are supported. Invalid URL: ${url}`)
      process.exit(1)
    }

    sources.push({ name, url })
  }

  return sources
}

// Simple ICS parser for basic event extraction
export interface CalendarEvent {
  uid: string
  summary: string
  description: string
  location: string
  dtstart: Date
  dtend: Date
  allDay: boolean
  source: string
  rrule: unknown | null
  isRecurring: boolean
}

// Interface for recurrence rule options (subset of what node-ical provides)
interface RRuleOptions {
  dtstart?: Date
  tzid?: string
  freq?: string
  interval?: number
  count?: number
  until?: Date
  byweekday?: unknown[]
  bymonth?: number[]
  bymonthday?: number[]
}

// Interface for RRule object from node-ical
interface RRule {
  between(start: Date, end: Date): Date[]
  origOptions: RRuleOptions
}

// Type guard to check if an object has rrule property
function hasRRule(obj: unknown): obj is { rrule: RRule } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'rrule' in obj &&
    typeof (obj as { rrule: unknown }).rrule === 'object' &&
    (obj as { rrule: unknown }).rrule !== null
  )
}

/**
 * Calculate timezone offset adjustment for recurrence dates
 * This uses date-fns-tz to properly handle timezone conversions
 */
function calculateTimezoneOffset(date: Date, originalStart: Date, tzid?: string): Date {
  if (!tzid) {
    // No timezone present - calculate offset from original start date
    // This handles DST transitions properly
    const originalOffset = originalStart.getTimezoneOffset()
    const recurrenceOffset = date.getTimezoneOffset()
    const offsetDiffMinutes = originalOffset - recurrenceOffset

    // Apply the offset difference
    return new Date(date.getTime() + offsetDiffMinutes * 60 * 1000)
  }

  try {
    // For events with timezone information, we need to:
    // 1. Get the time components from the original event
    // 2. Apply them to the recurrence date in the original timezone
    // 3. Convert to local time

    // Get the original time in the specified timezone
    const originalInTz = toZonedTime(originalStart, tzid)
    const hours = originalInTz.getHours()
    const minutes = originalInTz.getMinutes()
    const seconds = originalInTz.getSeconds()

    // Create a new date for the recurrence with the same time in the timezone
    const recurrenceDate = new Date(date)
    recurrenceDate.setUTCHours(0, 0, 0, 0) // Reset to start of day in UTC

    // Convert to the specified timezone and set the time
    const recurrenceInTz = toZonedTime(recurrenceDate, tzid)
    recurrenceInTz.setHours(hours, minutes, seconds, 0)

    // Convert back to UTC (which will be automatically converted to local timezone)
    const utcTime = fromZonedTime(recurrenceInTz, tzid)

    return utcTime
  } catch (error) {
    console.warn(`Failed to convert timezone for ${tzid}:`, error)
    // Fall back to simple offset calculation
    const originalOffset = originalStart.getTimezoneOffset()
    const recurrenceOffset = date.getTimezoneOffset()
    const offsetDiffMinutes = originalOffset - recurrenceOffset
    return new Date(date.getTime() + offsetDiffMinutes * 60 * 1000)
  }
}

/**
 * Expand recurring events within a date range
 */
export function expandRecurringEvents(events: CalendarEvent[], startDate: Date, endDate: Date): CalendarEvent[] {
  const expandedEvents: CalendarEvent[] = []

  for (const event of events) {
    if (!event.isRecurring || !hasRRule(event.rrule)) {
      expandedEvents.push(event)
      continue
    }

    try {
      const rrule = event.rrule as { rrule: RRule }
      const recurrenceDates = rrule.rrule.between(startDate, endDate)

      if (recurrenceDates.length === 0) {
        // No recurrences in this range, but include original if it falls in range
        if (event.dtstart >= startDate && event.dtstart <= endDate) {
          expandedEvents.push(event)
        }
        continue
      }

      // Create an event for each recurrence
      for (const recurrenceDate of recurrenceDates) {
        const adjustedDate = calculateTimezoneOffset(recurrenceDate, event.dtstart, rrule.rrule.origOptions.tzid)

        // Calculate duration from original event
        const originalDuration = event.dtend.getTime() - event.dtstart.getTime()
        const newEndDate = new Date(adjustedDate.getTime() + originalDuration)

        const recurringEvent: CalendarEvent = {
          ...event,
          uid: `${event.uid}_${adjustedDate.getTime()}`, // Make each recurrence unique
          dtstart: adjustedDate,
          dtend: newEndDate,
          isRecurring: false, // Mark as expanded so we don't process again
          rrule: null,
        }

        expandedEvents.push(recurringEvent)
      }
    } catch (error) {
      console.warn(`Failed to expand recurring event ${event.uid}:`, error)
      // Fall back to original event
      expandedEvents.push(event)
    }
  }

  return expandedEvents
}

export const parseIcsContent = async (icsContent: string, source: string): Promise<CalendarEvent[]> => {
  const entries = Object.values(await ical.async.parseICS(icsContent))
  return entries
    .filter((entry) => entry.type === 'VEVENT')
    .map((event) => {
      const hasRecurrence = hasRRule(event)

      return {
        uid: event.uid,
        summary: event.summary,
        description: event.description,
        location: event.location,
        dtstart: event.start,
        dtend: event.end,
        allDay: event.datetype === 'date',
        source: source,
        rrule: hasRecurrence ? event : null,
        isRecurring: hasRecurrence,
      } satisfies CalendarEvent
    })
}

// Format date for display
export const formatDate = (date: Date, allDay: boolean = false): string => {
  if (allDay) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } else {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}
