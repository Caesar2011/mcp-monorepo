import { registerTool } from '@mcp-monorepo/shared'
import { performKeywordSearch } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getUnexpandedEvents, type UnexpandedEvent } from '../ics-parser/index.js'
import { getPreparedIcs } from '../lib/event-store-2.js'
import { formatDate } from '../lib/format-date.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerSearchEventsTool = (server: McpServer) =>
  registerTool(server, {
    name: 'search-events',
    title: 'Search Calendar Events',
    description:
      'Search through all calendar events using keywords. Searches in title, description, location, attendees, and categories. Sorts by number of matching words.',
    inputSchema: {
      query: z
        .string()
        .describe('Search query with keywords separated by spaces, at least one keyword must be included'),
      limit: z.number().default(50).describe('Maximum number of events to return (default: 50)'),
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
          matchCount: z.number(),
          matchedWords: z.array(z.string()),
          organizer: z.any().optional(),
          attendees: z.array(z.any()).optional(),
          categories: z.array(z.string()).optional(),
          url: z.string().optional(),
          rrule: z.any().optional(),
          rdates: z.array(z.string()).optional(),
          exdates: z.array(z.string()).optional(),
        }),
      ),
      errors: z.array(z.string()),
      total: z.number(),
      searchQuery: z.string(),
    },
    isReadOnly: true,
    async fetcher({ query, limit }) {
      if (!query.trim()) {
        throw new Error('Search query cannot be empty')
      }

      const { prepared, errors } = await getPreparedIcs()
      const unexpandedEvents = getUnexpandedEvents(prepared)

      const results = performKeywordSearch(
        query,
        unexpandedEvents,
        (event) => {
          const source = event.customProperties?.['X-MCP-SOURCE']?.value ?? 'Unknown'
          const customPropValues = event.customProperties
            ? Object.values(event.customProperties).map((p) => p.value)
            : []
          const attendeeNames = event.attendees
            ? event.attendees.flatMap((a) => [a.email, a.commonName]).filter((x) => x !== undefined)
            : []

          return [
            event.summary,
            event.description,
            event.location,
            source,
            ...(event.categories || []),
            event.organizer?.commonName,
            ...attendeeNames,
            event.url,
            ...customPropValues,
          ].filter((v): v is string => !!v)
        },
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      )

      const limitedResults = results.slice(0, limit)

      return {
        results: limitedResults,
        total: results.length,
        searchQuery: query,
        errors: errors,
      }
    },
    formatter({ results, total, searchQuery, errors }) {
      const formattedEvents = results.map((result) => {
        const event = result.match as UnexpandedEvent
        const source = event.customProperties?.['X-MCP-SOURCE']?.value ?? 'Unknown'

        return {
          summary: event.summary,
          start: formatDate(new Date(event.start), event.allDay),
          ...(event.end ? { end: formatDate(new Date(event.end), event.allDay) } : {}),
          description:
            event.description && event.description.length > 400
              ? event.description.substring(0, 400) + '...'
              : event.description,
          location: event.location,
          uid: event.uid,
          source: source,
          matchCount: result.matchCount,
          matchedWords: result.matchedWords,
          organizer: event.organizer,
          attendees: event.attendees,
          categories: event.categories,
          url: event.url,
          rrule: event.rrule,
          rdates: event.rdates,
          exdates: event.exdates,
        }
      })

      return {
        events: formattedEvents,
        total,
        searchQuery,
        errors,
      }
    },
  })
