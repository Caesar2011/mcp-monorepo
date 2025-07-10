import { formatDate } from './helper.js'

import type { FetchEventsResult } from './types.js'

export function formatEventsResponse(result: FetchEventsResult): string {
  let output = `Calendar Events (${result.events.length} found from ${result.totalSources} source(s)):\nPeriod: ${result.startDate} to ${result.endDate}\n`

  if (result.recurringCount > 0) {
    output += `📅 Recurring events processed: ${result.recurringCount} (expanded to ${result.expandedCount} instances)\n`
  }

  if (result.errors.length > 0) {
    output += `\n⚠️ Errors encountered:\n${result.errors.map((e) => ` • ${e}`).join('\n')}\n`
  }

  output += '\n'

  result.events.forEach((event, index) => {
    output += `${index + 1}. ${event.summary}`
    if (event.uid.includes('_')) output += ' 🔄'
    output += `\n 📋 Source: ${event.source}\n`
    if (event.allDay) {
      output += ` 📅 ${formatDate(event.dtstart, true)}\n`
    } else {
      const startStr = formatDate(event.dtstart)
      const endStr = event.dtend ? formatDate(event.dtend) : ''
      output += ` 🕒 ${startStr}`
      if (endStr && endStr !== startStr) output += ` → ${endStr}`
      output += '\n'
    }
    if (event.location) output += ` 📍 ${event.location}\n`
    if (event.description) {
      const desc = event.description.length > 400 ? event.description.substring(0, 400) + '...' : event.description
      output += ` 📄 ${desc}\n`
    }
    output += '\n'
  })

  return output
}

export function formatEventsError(error: unknown): string {
  if (error instanceof Error) return `Error fetching calendar events: ${error.message}`
  if (typeof error === 'string') return `Error fetching calendar events: ${error}`
  return 'Error fetching calendar events: Unknown error'
}
