import { type CalendarEvent } from './types.js'

export function filterEvents(events: CalendarEvent[], start: Date, end: Date) {
  return events
    .filter((evt) => {
      const st = evt.dtstart
      const en = evt.dtend || evt.dtstart
      return st <= end && en >= start
    })
    .sort((a, b) => a.dtstart.getTime() - b.dtstart.getTime())
}
