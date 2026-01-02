import { registerTool } from '@mcp-monorepo/shared'
import { type ConversationsInfoResponse } from '@slack/web-api'
import { type MessageElement } from '@slack/web-api/dist/types/response/ConversationsHistoryResponse.js'
import { z } from 'zod'

import { formatMessage } from '../lib/formatters.js'
import { paginate, slackClient } from '../lib/slack-client.js'
import { type AnyChannel } from '../lib/types.js'

import type { MessageWithReplies, ConversationInfoWithReplies } from './get-channel-content.types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerGetChannelContentTool = (server: McpServer) =>
  registerTool(server, {
    name: 'get-channel-content',
    title: 'Get Channel Content',
    description: 'Returns message history/content for a channel by id, including replies.',
    inputSchema: {
      channelId: z.string().min(1).describe('The ID of the Slack channel to get content from'),
    },
    outputSchema: {
      channel: z.string(),
      messages: z.array(z.unknown()),
      total: z.number(),
    },
    isReadOnly: true,
    async fetcher({ channelId }) {
      // Fetch channel info
      const info = await slackClient.conversations.info({ channel: channelId, include_num_members: true })
      if (!info.ok) {
        throw new Error('Failed to fetch channel info')
      }

      // Fetch channel history
      const history = await slackClient.conversations.history({
        channel: channelId,
        limit: 28,
        include_all_metadata: true,
      })

      const result: ConversationsInfoResponse & { messages: MessageElement[] } = {
        ...info,
        messages: history.messages ?? [],
      }

      // Fetch replies for messages that have them
      const promises = result.messages.map(async (message): Promise<MessageWithReplies> => {
        if (message.reply_count && message.ts) {
          const thread: MessageElement[] = []
          for await (const replies of paginate(slackClient.conversations.replies, {
            channel: channelId,
            ts: message.ts,
          })) {
            thread.push(...(replies.messages ?? []))
          }
          const sortedReplies = thread.sort((a, b) => ((a.ts ?? '0') < (b.ts ?? '0') ? -1 : 1))
          return { ...message, replies: sortedReplies }
        }
        return { ...message, replies: [] }
      })

      const messages = await Promise.all(promises)
      const resultWithReplies: ConversationInfoWithReplies = { ...result, messages }

      return { results: resultWithReplies, total: messages.length }
    },
    async formatter({ results, total }) {
      const formattedMessages = await Promise.all(results.messages.map(formatMessage))
      const channel = results.channel as AnyChannel

      return {
        channel: channel.is_im ? channel.user : channel.name,
        messages: formattedMessages,
        total,
      }
    },
  })
