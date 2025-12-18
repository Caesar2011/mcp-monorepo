import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getRawEvents } from '../lib/event-store.js'
import { filterEvents } from '../lib/filter-events.js'
import { formatDate } from '../lib/format-date.js'
import { resolveRecurrence } from '../lib/recurrrence.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerFetchEventsTool = (server: McpServer) =>
  registerTool(server, {
    name: 'fetch-events',
    title: 'Fetch Calendar Events',
    description: 'Fetches events from multiple ICS calendar URLs for a specified time period.',
    inputSchema: {
      offset: z.number().default(0).describe('Offset to start returning events from (default: 0)'),
      limit: z.number().default(50).describe('Maximum number of events to return (default: 50)'),
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
    },
    outputSchema: {
      events: z.array(
        z.object({
          summary: z.string(),
          start: z.string(),
          end: z.string().optional(),
          description: z.string().optional(),
          location: z.string().optional(),
          uid: z.string(),
          source: z.string(),
        }),
      ),
      errors: z.array(z.string()),
      total: z.number(),
    },
    isReadOnly: true,
    async fetcher({ endDate, limit, offset, startDate }) {
      const start = new Date(startDate + 'T00:00:00')
      const end = new Date(endDate + 'T23:59:59')
      if (start > end) throw new Error('Error: Start date must be before end date')

      const events = await getRawEvents()
      const expandedEvents = resolveRecurrence(events.events, start, end)
      const filteredEvents = filterEvents(expandedEvents, start, end)
      return {
        events: filteredEvents.slice(offset, offset + limit),
        errors: events.errors,
        total: filteredEvents.length,
      }
    },
    formatter({ events, errors, total }) {
      const formattedEvents = events.map((event) => ({
        summary: event.summary,
        start: formatDate(event.dtstart, event.allDay),
        ...(event.dtend ? { end: formatDate(event.dtend, event.allDay) } : {}),
        description: event.description
          ? event.description.length > 400
            ? event.description.substring(0, 400) + '...'
            : event.description
          : undefined,
        location: event.location,
        uid: event.uid,
        source: event.source,
      }))

      return {
        events: formattedEvents,
        errors,
        total,
      }
    },
  })
