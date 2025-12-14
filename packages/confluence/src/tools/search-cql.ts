import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { type SearchSqlTypes } from './search-sql.types.js'
import { requestConfluence } from '../lib/request.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerSearchCqlTool = (server: McpServer) =>
  registerTool(server, {
    name: 'search-cql',
    title: 'Search Confluence with CQL',
    description: 'Search Confluence content using a CQL query.',
    inputSchema: {
      cqlQuery: z.string().describe('Confluence Query Language string'),
      limit: z.number().int().min(1).max(100).describe('Number of results to return (default 10)').optional(),
      start: z.number().int().min(0).describe('Result offset for pagination (default 0)').optional(),
    },
    outputSchema: {
      results: z.array(
        z.object({
          id: z.string(),
          type: z.enum(['page', 'global']),
          title: z.string().optional(),
          key: z.string().optional(),
          name: z.string().optional(),
          _expandable: z.record(z.string().optional()),
        }),
      ),
      total: z.number().optional(),
      next: z.string().optional(),
    },
    isReadOnly: true,
    async fetcher({ cqlQuery, limit = 10, start = 0 }) {
      return await requestConfluence<SearchSqlTypes>({
        endpoint: '/rest/api/content/search',
        queryParams: {
          cql: cqlQuery,
          limit,
          start,
        },
      })
    },
    formatter(data) {
      return {
        results: data.results.map((result) => ({
          id: `${result.id}`,
          type: result.type,
          title: result.title,
          name: result.name,
          key: result.key,
          _expandable: Object.fromEntries(Object.entries(result._expandable).filter(([, value]) => value)),
        })),
        total: data.totalSize,
        next: data._links.next,
      }
    },
  })
