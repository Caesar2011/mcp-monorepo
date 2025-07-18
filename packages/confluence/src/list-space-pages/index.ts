/**
 * Tool registration for list-space-pages
 */
import { z } from 'zod'

import { listSpacePagesHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerListSpacePagesTool(server: McpServer): void {
  server.registerTool(
    'list-space-pages',
    {
      title: 'List Pages in Space',
      description: 'List all Confluence pages in a given space.',
      inputSchema: {
        spaceKey: z.string().describe('The Confluence space key'),
        limit: z.number().int().min(1).max(100).describe('Number of results to return (default 50)').optional(),
        start: z.number().int().min(0).describe('Result offset for pagination (default 0)').optional(),
      },
    },
    listSpacePagesHandler,
  )
}
