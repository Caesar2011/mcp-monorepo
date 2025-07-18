/**
 * Tool registration for search-cql
 */
import { z } from 'zod'

import { searchCqlHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerSearchCqlTool(server: McpServer): void {
  server.registerTool(
    'search-cql',
    {
      title: 'Search Confluence with CQL',
      description: 'Search Confluence content using a CQL query.',
      inputSchema: {
        cqlQuery: z.string().describe('Confluence Query Language string'),
        limit: z.number().int().min(1).max(100).describe('Number of results to return (default 10)').optional(),
        start: z.number().int().min(0).describe('Result offset for pagination (default 0)').optional(),
      },
    },
    searchCqlHandler,
  )
}
