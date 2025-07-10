export interface FetchEventsParams {
  startDate: string
  endDate: string
  limit: number
}

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

export interface FetchEventsResult {
  events: CalendarEvent[]
  totalSources: number
  errors: string[]
  recurringCount: number
  expandedCount: number
  startDate: string
  endDate: string
  limit: number
}
