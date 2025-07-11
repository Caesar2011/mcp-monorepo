// Tool registration for fetch-latest-mails
import { toolHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerFetchLatestMailsTool(server: McpServer): void {
  server.registerTool(
    'fetch-latest-mails',
    {
      title: 'Fetch Latest Mails',
      description: 'Query all mails from the past week until today for all configured accounts. No parameters.',
      inputSchema: {},
    },
    toolHandler,
  )
}
