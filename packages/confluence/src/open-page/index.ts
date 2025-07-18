/**
 * Tool registration for open-page
 */
import { z } from 'zod'

import { openPageHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerOpenPageTool(server: McpServer): void {
  server.registerTool(
    'open-page',
    {
      title: 'Open Confluence Page',
      description: 'Fetch a Confluence page content by pageId (storage format).',
      inputSchema: {
        pageId: z.string().describe('The Confluence page ID to fetch'),
      },
    },
    openPageHandler,
  )
}
