import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { requestConfluence } from '../lib/request.js'

import type { ConfluenceListPagesResponse } from './list-pages-of-space.types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerListSpacePagesTool = (server: McpServer) =>
  registerTool(server, {
    name: 'list-pages-of-space',
    title: 'List Pages of Space',
    description: 'List all Confluence pages in a given space.',
    inputSchema: {
      spaceKey: z.string().describe('The Confluence space key (not the id) to fetch pages from. Example: "MYSPACE"'),
      limit: z.number().int().min(1).max(100).describe('Number of results to return (default 50)').optional(),
      start: z.number().int().min(0).describe('Result offset for pagination (default 0)').optional(),
    },
    outputSchema: {
      pages: z.array(
        z.object({
          id: z.string(),
          type: z.enum(['page', 'global']),
          title: z.string(),
          _expandable: z.record(z.string(), z.string().optional()),
        }),
      ),
      next: z.string().optional(),
    },
    isReadOnly: true,
    async fetcher({ spaceKey, limit = 50, start = 0 }) {
      return await requestConfluence<ConfluenceListPagesResponse>({
        endpoint: `/rest/api/space/${encodeURIComponent(spaceKey)}/content/page`,
        queryParams: { limit, start },
      })
    },
    formatter(data) {
      return {
        pages: data.results.map((result) => ({
          id: `${result.id}`,
          type: result.type,
          title: result.title,
          _expandable: Object.fromEntries(Object.entries(result._expandable).filter(([, value]) => value)),
        })),
        next: data._links.next,
      }
    },
  })
