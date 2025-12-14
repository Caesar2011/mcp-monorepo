import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getChannelListCache } from '../lib/channel-cache.js'
import { formatChannel } from '../lib/formatters.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerGetChannelInfoTool = (server: McpServer) =>
  registerTool(server, {
    name: 'get-channel-info',
    title: 'Get Channel Info',
    description: 'Returns info details for a Slack channel by id.',
    inputSchema: {
      channelId: z.string().min(1).describe('The ID of the Slack channel to get information for'),
    },
    outputSchema: {
      channel: z.unknown(),
    },
    isReadOnly: true,
    async fetcher({ channelId }) {
      const channels = await getChannelListCache()
      const channel = channels.find((ch) => ch.id === channelId)
      if (!channel) {
        throw new Error(`Channel with id ${channelId} not found in cache`)
      }
      return channel
    },
    async formatter(channel) {
      return {
        channel: await formatChannel(channel),
      }
    },
  })
