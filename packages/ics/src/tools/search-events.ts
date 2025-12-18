import { registerTool } from '@mcp-monorepo/shared'
import { performKeywordSearch } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getRawEvents } from '../lib/event-store.js'
import { formatDate } from '../lib/format-date.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerSearchEventsTool = (server: McpServer) =>
  registerTool(server, {
    name: 'search-events',
    title: 'Search Calendar Events',
    description:
      'Search through all calendar events using keywords. Searches in title and description, sorts by number of matching words.',
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

      const events = await getRawEvents()

      const results = performKeywordSearch(
        query,
        events.events,
        (event) => [event.summary, event.description, event.location, event.source],
        (a, b) => new Date(a.dtstart).getTime() - new Date(b.dtstart).getTime(),
      )

      // Limit results based on the specified `limit`
      const limitedResults = results.slice(0, limit)

      return {
        results: limitedResults,
        total: results.length,
        searchQuery: query,
        errors: events.errors,
      }
    },
    formatter({ results, total, searchQuery, errors }) {
      const formattedEvents = results.map((result) => {
        const { description, dtend, dtstart, location, source, summary, uid } = result.match
        return {
          summary: summary,
          start: formatDate(dtstart, true),
          ...(dtend ? { end: formatDate(dtend, true) } : {}),
          description: description
            ? description.length > 400
              ? description.substring(0, 400) + '...'
              : description
            : undefined,
          location: location,
          uid: uid,
          source: source,
          matchCount: result.matchCount,
          matchedWords: result.matchedWords,
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
