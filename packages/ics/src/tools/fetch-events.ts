import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getEventsBetween } from '../ics-parser/index.js'
import { getPreparedIcs } from '../lib/event-store-2.js'
import { formatDate } from '../lib/format-date.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerFetchEventsTool = (server: McpServer) =>
  registerTool(server, {
    name: 'fetch-events',
    title: 'Fetch Calendar Events',
    description: 'Fetches events from multiple ICS calendar URLs for a specified time period. cc',
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
      if (new Date(startDate) > new Date(endDate)) {
        throw new Error('Error: Start date must be before end date')
      }

      // Get the prepared (and cached) data from the new store
      const { prepared, errors } = await getPreparedIcs()

      // The new parser requires UTC ISO strings for the range
      const startIso = new Date(`${startDate}T00:00:00.000Z`).toISOString()
      const endIso = new Date(`${endDate}T23:59:59.999Z`).toISOString()

      // Let the new parser do all the heavy lifting of expanding and filtering
      const expandedEvents = getEventsBetween(prepared, startIso, endIso)

      return {
        events: expandedEvents.slice(offset, offset + limit),
        errors,
        total: expandedEvents.length,
      }
    },
    formatter({ events, errors, total }) {
      const formattedEvents = events.map((event) => {
        const source = event.customProperties?.['X-MCP-SOURCE']?.value ?? 'Unknown'

        return {
          summary: event.summary,
          start: formatDate(new Date(event.start), event.allDay),
          ...(event.end ? { end: formatDate(new Date(event.end), event.allDay) } : {}),
          description: event.description
            ? event.description.length > 400
              ? event.description.substring(0, 400) + '...'
              : event.description
            : undefined,
          location: event.location,
          uid: event.uid,
          source: source,
        }
      })

      return {
        events: formattedEvents,
        errors,
        total,
      }
    },
  })
