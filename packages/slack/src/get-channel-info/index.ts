import { z } from 'zod'

import { getChannelInfoHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGetChannelInfoTool(server: McpServer): void {
  server.registerTool(
    'get-channel-info',
    {
      title: 'Get Channel Info',
      description: 'Returns info details for a Slack channel by id.',
      inputSchema: {
        channelId: z.string().min(1),
      },
    },
    getChannelInfoHandler,
  )
}
