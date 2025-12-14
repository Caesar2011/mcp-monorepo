import { performKeywordSearch, registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getChannelListCache } from '../lib/channel-cache.js'
import { formatChannel } from '../lib/formatters.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerSearchChannelTool = (server: McpServer) =>
  registerTool(server, {
    name: 'search-channel',
    title: 'Search Slack Channels',
    description:
      'Search for Slack channels by multiple keywords in name, topic, or purpose. Each word is a keyword, results are sorted by relevance.',
    inputSchema: {
      search: z
        .string()
        .min(1)
        .describe('Search query with keywords separated by spaces. Each word is treated as a separate keyword.'),
    },
    outputSchema: {
      channels: z.array(z.unknown()),
      total: z.number(),
    },
    isReadOnly: true,
    async fetcher({ search }) {
      const channels = await getChannelListCache()

      return performKeywordSearch(
        search,
        channels,
        (channel) => {
          if (channel.is_im) {
            return [channel.user]
          } else {
            const name = channel.name
            const topic = channel.topic?.value
            const purpose = channel.purpose?.value
            return [name, topic, purpose]
          }
        },
        (a, b) => {
          const aName = a.is_im ? a.user : a.name || ''
          const bName = b.is_im ? b.user : b.name || ''
          return aName.localeCompare(bName)
        },
      )
    },
    async formatter(results) {
      const formattedChannels = await Promise.all(
        results.map(async (result) => {
          const formatted = await formatChannel(result.match)
          return {
            channel: formatted,
            matchCount: result.matchCount,
            matchedWords: result.matchedWords,
          }
        }),
      )

      return {
        channels: formattedChannels,
        total: results.length,
      }
    },
  })
