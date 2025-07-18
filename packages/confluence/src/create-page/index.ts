/**
 * Tool registration for create-page
 */
import { z } from 'zod'

import { createPageHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerCreatePageTool(server: McpServer): void {
  server.registerTool(
    'create-page',
    {
      title: 'Create Confluence Page',
      description: 'Create a new page in Confluence.',
      inputSchema: {
        spaceKey: z.string().describe('The Confluence space key'),
        title: z.string().describe('The title of the new page'),
        content: z.string().describe('The content of the new page (in storage format)'),
        parentId: z.string().describe('Optional parent page ID').optional(),
      },
    },
    createPageHandler,
  )
}
