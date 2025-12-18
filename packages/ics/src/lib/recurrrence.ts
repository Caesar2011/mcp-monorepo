import type { CalendarEvent, RawIcalEvent } from './types.js'

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

export function resolveRecurrence(events: RawIcalEvent[], startDate: Date, endDate: Date): CalendarEvent[] {
  const createCalendarEvent = (
    event: RawIcalEvent,
    dtstart?: Date,
    dtend?: Date,
    uidSuffix?: string,
  ): CalendarEvent => ({
    uid: uidSuffix ? `${event.uid}_${uidSuffix}` : event.uid,
    summary: event.summary,
    description: event.description,
    location: event.location,
    dtstart: dtstart ?? event.dtstart,
    dtend: dtend ?? event.dtend,
    allDay: event.allDay,
    source: event.source,
  })

  const getExceptionTimestamps = (event: RawIcalEvent): number[] => {
    const exdateTimes = event.exdate ? Object.values(event.exdate).map((d) => d.getTime()) : []
    const cancelledRecurrenceTimes = event.recurrences
      ? Object.values(event.recurrences)
          .filter((r) => r.status === 'CANCELLED')
          .map((r) => r.dtstart.getTime())
      : []
    return [...exdateTimes, ...cancelledRecurrenceTimes]
  }

  const expandSingleEvent = (event: RawIcalEvent): CalendarEvent[] => {
    if (!event.rrule) {
      if (event.dtstart >= startDate && event.dtstart <= endDate) {
        return [createCalendarEvent(event)]
      }
      return []
    }

    try {
      const recurrences = event.rrule.between(startDate, endDate)

      if (recurrences.length === 0) {
        return event.dtstart >= startDate && event.dtstart <= endDate ? [createCalendarEvent(event)] : []
      }

      const exceptionTimes = getExceptionTimestamps(event)
      const duration = event.dtend && event.dtstart ? event.dtend.getTime() - event.dtstart.getTime() : 0

      return recurrences
        .map((recurrenceDate) => {
          const adjustedStart = getAdjustedRecurrenceDate(event.rruleOptions, event.dtstart, recurrenceDate)

          if (exceptionTimes.includes(adjustedStart.getTime())) {
            return undefined
          }

          const adjustedEnd = duration ? new Date(adjustedStart.getTime() + duration) : undefined
          return createCalendarEvent(event, adjustedStart, adjustedEnd, adjustedStart.getTime().toString())
        })
        .filter((e) => e !== undefined)
    } catch {
      if (event.dtstart >= startDate && event.dtstart <= endDate) {
        return [createCalendarEvent(event)]
      }
      return []
    }
  }

  return events.flatMap(expandSingleEvent)
}
