import { z } from 'zod'

import { getChannelContentHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGetChannelContentTool(server: McpServer): void {
  server.registerTool(
    'get-channel-content',
    {
      title: 'Get Channel Content',
      description: 'Returns message history/content for a channel by id, including replies.',
      inputSchema: { channelId: z.string().min(1) },
    },
    getChannelContentHandler,
  )
}
