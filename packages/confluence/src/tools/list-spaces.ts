import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { type ConfluenceListSpacesResponse } from './list-spaces.types.js'
import { requestConfluence } from '../lib/request.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerListSpacesTool = (server: McpServer) =>
  registerTool(server, {
    name: 'list-spaces',
    title: 'List Confluence Spaces',
    description: 'List all Confluence spaces.',
    inputSchema: {
      limit: z.number().int().min(1).max(100).describe('Number of results to return (default 50)').optional(),
      start: z.number().int().min(0).describe('Result offset for pagination (default 0)').optional(),
    },
    outputSchema: {
      spaces: z.array(
        z.object({
          id: z.string(),
          type: z.enum(['page', 'global']),
          key: z.string(),
          name: z.string(),
          created: z.object({
            by: z.string(),
            at: z.string(),
          }),
          modified: z.object({
            by: z.string(),
            at: z.string(),
          }),
          _expandable: z.record(z.string().optional()),
        }),
      ),
      next: z.string().optional(),
    },
    isReadOnly: true,
    async fetcher({ limit = 50, start = 0 }) {
      return await requestConfluence<ConfluenceListSpacesResponse>({
        endpoint: '/rest/api/space',
        queryParams: { limit, start },
      })
    },
    formatter(data) {
      return {
        spaces: data.results.map((result) => ({
          id: `${result.id}`,
          type: result.type,
          key: result.key,
          name: result.name,
          created: {
            by: result.creator.displayName,
            at: result.creationDate,
          },
          modified: {
            by: result.lastModifier.displayName,
            at: result.lastModificationDate,
          },
          _expandable: Object.fromEntries(Object.entries(result._expandable).filter(([, value]) => value)),
        })),
        next: data._links.next,
      }
    },
  })
