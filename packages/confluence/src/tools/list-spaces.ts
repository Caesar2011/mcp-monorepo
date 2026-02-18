import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getConfluenceApiVersion } from '../lib/confluence-env.js'
import { listSpaces } from '../lib/confluence.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerListSpacesTool = (server: McpServer) =>
  registerTool(server, {
    name: 'list-spaces',
    title: 'List Confluence Spaces',
    description:
      'List all Confluence spaces. Supports both offset-based pagination (v1) and cursor-based pagination (v2).',
    inputSchema: {
      limit: z.number().int().min(1).max(100).describe('Number of results to return (default 50)').optional(),
      start: z.number().int().min(0).describe('Result offset for pagination - v1 only (default 0)').optional(),
      cursor: z.string().optional().describe('Cursor for next page - v2 only (from previous response)'),
    },
    outputSchema: {
      results: z.array(
        z.object({
          id: z.string(),
          key: z.string(),
          name: z.string(),
          type: z.string(),
          webUrl: z.string(),
        }),
      ),
      nextCursor: z.string().optional().describe('Next page cursor (v2 only)'),
      nextStart: z.number().optional().describe('Next page offset (v1 only)'),
      hasMore: z.boolean(),
    },
    isReadOnly: true,
    async fetcher({ limit, start, cursor }) {
      return await listSpaces({
        limit,
        start,
        cursor,
      })
    },
    formatter(data) {
      const apiVersion = getConfluenceApiVersion()
      return {
        results: data.results,
        ...(apiVersion === '2' ? { nextCursor: data.nextCursor } : { nextStart: data.nextStart }),
        hasMore: data.hasMore,
      }
    },
  })
