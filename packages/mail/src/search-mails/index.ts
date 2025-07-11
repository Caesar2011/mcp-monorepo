// Tool registration for search-mails tool
import { z } from 'zod'

import { toolHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerSearchMailsTool(server: McpServer): void {
  server.registerTool(
    'search-mails',
    {
      title: 'Search mails',
      description:
        'Find mails by subject, body, or sender address across all configured accounts. At least one of searchString or fromContains must be set.',
      inputSchema: {
        searchString: z.string().min(1).optional().describe('Substring to search-mails in subject or body.'),
        searchBody: z.boolean().optional().describe('If true, also search-mails in mail body.'),
        fromContains: z.string().min(1).optional().describe('Substring to search-mails in sender address.'),
      },
    },
    toolHandler,
  )
}
