import { getChannelSidebarHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGetChannelSidebarTool(server: McpServer): void {
  server.registerTool(
    'get-channel-sidebar',
    {
      title: 'Get Channel Sidebar',
      description: 'Returns a Slack-style list of channels by sidebar section.',
      inputSchema: {},
    },
    getChannelSidebarHandler,
  )
}
