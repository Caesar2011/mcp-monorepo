import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { CalendarEvent, formatDate, getIcsUrls, parseIcsContent, expandRecurringEvents } from './helper.js'

export const currentDatetimeHandler = async ({ format = 'local' }): Promise<CallToolResult> => {
  try {
    const now = new Date()
    let formattedTime = ''

    switch (format) {
      case 'iso':
        formattedTime = now.toISOString()
        break
      case 'utc':
        formattedTime = now.toUTCString()
        break
      case 'timestamp':
        formattedTime = now.getTime().toString()
        break
      case 'local':
      default:
        formattedTime = now.toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        })
        break
    }

    const output = `Current Date and Time:\n${formattedTime}`

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Failed to get current datetime: ${errorMessage}`)

    return {
      content: [
        {
          type: 'text',
          text: `Error getting current datetime: ${errorMessage}`,
          _meta: { stderr: errorMessage },
        },
      ],
    }
  }
}

export const fetchEventsHandler = async ({
  startDate,
  endDate,
  limit = 50,
}: {
  startDate: string
  endDate: string
  limit?: number | undefined
}): Promise<CallToolResult> => {
  try {
    const sources = getIcsUrls()
    console.log(`MCP Tool: Fetching calendar events from ${sources.length} source(s)`)

    // Parse date range
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T23:59:59')

    if (start > end) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: Start date must be before end date',
            _meta: { stderr: 'Invalid date range' },
          },
        ],
      }
    }

    // Fetch and parse ICS content from all sources
    const allEvents: CalendarEvent[] = []
    const errors: string[] = []

    for (const source of sources) {
      try {
        console.log(`Fetching from ${source.name}: ${source.url}`)
        const icsContent = await fetch(source.url)
        if (!icsContent.ok) {
          throw new Error(`Failed to fetch from ${source.name}: ${icsContent.statusText}`)
        }
        const icsContentText = await icsContent.text()
        if (!icsContentText) {
          throw new Error(`Failed to fetch from ${source.name}: No content`)
        }
        const events = await parseIcsContent(icsContentText, source.name)
        allEvents.push(...events)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${source.name}: ${errorMessage}`)
        console.error(`Failed to fetch from ${source.name}: ${errorMessage}`)
      }
    }

    // Expand recurring events within the date range
    const expandedEvents = expandRecurringEvents(allEvents, start, end)

    // Filter events by date range
    const filteredEvents = expandedEvents
      .filter((event) => {
        const eventStart = event.dtstart
        const eventEnd = event.dtend || event.dtstart

        // Event overlaps with our date range
        return eventStart <= end && eventEnd >= start
      })
      .sort((a, b) => a.dtstart.getTime() - b.dtstart.getTime())
      .slice(0, limit)

    if (filteredEvents.length === 0 && errors.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No events found between ${startDate} and ${endDate}`,
          },
        ],
      }
    }

    // Count recurring vs non-recurring events for stats
    const recurringCount = allEvents.filter((e) => e.isRecurring).length
    const totalOriginalEvents = allEvents.length
    const expandedCount = expandedEvents.length - (totalOriginalEvents - recurringCount)

    // Format events for display
    let output = `Calendar Events (${filteredEvents.length} found from ${sources.length} source(s)):\n`
    output += `Period: ${startDate} to ${endDate}\n`

    if (recurringCount > 0) {
      output += `📅 Recurring events processed: ${recurringCount} (expanded to ${expandedCount} instances)\n`
    }

    if (errors.length > 0) {
      output += `\n⚠️ Errors encountered:\n${errors.map((e) => ` • ${e}`).join('\n')}\n`
    }

    output += '\n'

    filteredEvents.forEach((event, index) => {
      output += `${index + 1}. ${event.summary}`

      // Add recurrence indicator
      if (event.uid.includes('_')) {
        output += ' 🔄' // Recurring event instance indicator
      }

      output += '\n'
      output += ` 📋 Source: ${event.source}\n`

      if (event.allDay) {
        output += ` 📅 ${formatDate(event.dtstart, true)}\n`
      } else {
        const startStr = formatDate(event.dtstart)
        const endStr = event.dtend ? formatDate(event.dtend) : ''
        output += ` 🕒 ${startStr}`
        if (endStr && endStr !== startStr) {
          output += ` → ${endStr}`
        }
        output += '\n'
      }

      if (event.location) {
        output += ` 📍 ${event.location}\n`
      }

      if (event.description) {
        const desc = event.description.length > 400 ? event.description.substring(0, 400) + '...' : event.description
        output += ` 📄 ${desc}\n`
      }

      output += '\n'
    })

    return {
      content: [
        {
          type: 'text',
          text: output,
          _meta: { stderr: errors.join('\n') },
        },
      ],
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Failed to fetch calendar events: ${errorMessage}`)

    return {
      content: [
        {
          type: 'text',
          text: `Error fetching calendar events: ${errorMessage}`,
          _meta: { stderr: errorMessage },
        },
      ],
    }
  }
}
