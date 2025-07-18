import { getDmListHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGetDmListTool(server: McpServer): void {
  server.registerTool(
    'get-dm-list',
    {
      title: 'Get Direct Message List',
      description: 'Returns a list of all direct and group DMs the user can access.',
      inputSchema: {},
    },
    getDmListHandler,
  )
}
