// Tool registration for latest-mails
import { toolHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerLatestMailsTool(server: McpServer): void {
  server.registerTool(
    'latest-mails',
    {
      title: 'Latest Mails',
      description: 'Query all mails from yesterday and today for all configured accounts. No parameters.',
      inputSchema: {},
    },
    toolHandler,
  )
}
