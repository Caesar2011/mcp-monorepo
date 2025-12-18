import { type VEventStatus } from 'node-ical'

export interface CalendarEvent {
  uid: string
  summary: string
  dtstart: Date
  dtend?: Date
  allDay: boolean
  location?: string
  description?: string
  source: string
  isRecurring?: boolean
}

export interface RRuleLike {
  between: (start: Date, end: Date) => Date[]
  origOptions?: { tzid?: string; dtstart: Date; [key: string]: unknown }
}

export interface RawIcalEvent {
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
  exdate?: { [key: string]: Date }
  recurrences?: { [key: string]: RawIcalEvent }
  status?: VEventStatus
}

export interface CalendarSource {
  name: string
  url: string
}
