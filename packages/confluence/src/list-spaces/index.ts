/**
 * Tool registration for list-spaces
 */
import { z } from 'zod'

import { listSpacesHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerListSpacesTool(server: McpServer): void {
  server.registerTool(
    'list-spaces',
    {
      title: 'List Confluence Spaces',
      description: 'List all Confluence spaces.',
      inputSchema: {
        limit: z.number().int().min(1).max(100).describe('Number of results to return (default 50)').optional(),
        start: z.number().int().min(0).describe('Result offset for pagination (default 0)').optional(),
      },
    },
    listSpacesHandler,
  )
}
