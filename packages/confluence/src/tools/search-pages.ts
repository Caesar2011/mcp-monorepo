/**
 * Search Confluence pages by title (API v2 only)
 */

import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getConfluenceApiVersion } from '../lib/confluence-env.js'
import { searchPages } from '../lib/confluence.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerSearchPagesTool = (server: McpServer) =>
  registerTool(server, {
    name: 'search-pages',
    title: 'Search Confluence Pages',
    description:
      'Search Confluence pages by title using API v2. Returns pages matching the title query with cursor-based pagination.',
    inputSchema: {
      query: z.string().describe('Search query to match page titles'),
      cursor: z.string().optional().describe('Cursor for next page of results (from previous response)'),
      limit: z.number().int().min(1).max(100).optional().describe('Maximum number of results to return (default: 50)'),
    },
    outputSchema: {
      results: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          spaceKey: z.string(),
          webUrl: z.string(),
          content: z.string().optional(),
        }),
      ),
      nextCursor: z.string().optional(),
      hasMore: z.boolean(),
    },
    isReadOnly: true,
    async fetcher(params) {
      const apiVersion = getConfluenceApiVersion()
      if (apiVersion !== '2') {
        throw new Error(
          'search-pages is only available in API v2. Set CONFLUENCE_API_VERSION=2 or use search-cql for v1.',
        )
      }

      return searchPages(params.query, {
        cursor: params.cursor,
        limit: params.limit,
      })
    },
    formatter(data) {
      return {
        results: data.results.map((page) => ({
          id: page.id,
          title: page.title,
          spaceKey: page.spaceKey,
          webUrl: page.webUrl,
          content: page.content,
        })),
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
      }
    },
  })
