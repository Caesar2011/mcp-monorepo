import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { formatChannel } from '../lib/formatters.js'
import { runSlackPost } from '../lib/slack-client.js'

import type { SlackDmResponse } from './get-dm-list.types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerGetDmListTool = (server: McpServer) =>
  registerTool(server, {
    name: 'get-dm-list',
    title: 'Get Direct Message List',
    description: 'Returns a list of all direct and group DMs the user can access.',
    inputSchema: {},
    outputSchema: {
      dms: z.array(
        z.object({
          id: z.string(),
          latest: z.object({
            ts: z.string(),
            message: z.unknown().optional(),
          }),
          channel: z.unknown(),
        }),
      ),
    },
    isReadOnly: true,
    async fetcher() {
      const response = await runSlackPost<SlackDmResponse>(
        'client.dms',
        new URLSearchParams({
          count: '15',
          include_closed: 'true',
          include_channel: 'true',
          exclude_bots: 'true',
          priority_mode: 'priority',
        }),
      )
      return [...(response.ims ?? []), ...(response.mpims ?? [])].sort((a, b) => (a.latest < b.latest ? 1 : -1))
    },
    async formatter(results) {
      const formattedDms = await Promise.all(
        results.map(async (dm) => ({
          id: dm.id,
          latest: {
            ts: dm.latest,
            message: dm.message,
          },
          channel: await formatChannel(dm.channel),
        })),
      )

      return {
        dms: formattedDms,
      }
    },
  })
