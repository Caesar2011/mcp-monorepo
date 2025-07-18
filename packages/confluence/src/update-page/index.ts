/**
 * Tool registration for update-page
 */
import { z } from 'zod'

import { updatePageHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerUpdatePageTool(server: McpServer): void {
  server.registerTool(
    'update-page',
    {
      title: 'Update Confluence Page',
      description: 'Update the title and/or content of a Confluence page.',
      inputSchema: {
        pageId: z.string().describe('The Confluence page ID to update'),
        newTitle: z.string().describe('The new title for the page'),
        newContent: z.string().describe('The new content for the page (in storage format)'),
        currentVersionNumber: z
          .number()
          .int()
          .min(1)
          .describe('Current version number of the page (retrieved from latest page GET)'),
      },
    },
    updatePageHandler,
  )
}
