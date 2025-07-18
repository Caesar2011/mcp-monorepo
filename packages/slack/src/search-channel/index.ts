import { z } from 'zod'

import { searchChannelHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerSearchChannelTool(server: McpServer): void {
  server.registerTool(
    'search-channel',
    {
      title: 'Search Slack Channels',
      description: 'Search for a Slack channel by name, topic, or purpose.',
      inputSchema: { search: z.string().min(1) },
    },
    searchChannelHandler,
  )
}
