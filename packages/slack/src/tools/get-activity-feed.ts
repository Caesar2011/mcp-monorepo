import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { type ActivityFeedResponse } from './get-activity-feed.types.js'
import { formatActivityFeed } from '../lib/format-activity-feed.js'
import { runSlackPost } from '../lib/slack-client.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerGetActivityFeedTool = (server: McpServer) =>
  registerTool(server, {
    name: 'get-activity-feed',
    title: 'Get Activity Feed',
    description: 'Fetches the latest activity/events from Slack (threads, mentions, reactions, etc).',
    inputSchema: {},
    outputSchema: {
      feed: z.unknown(),
    },
    isReadOnly: true,
    async fetcher() {
      const body = new URLSearchParams({
        limit: '20',
        types:
          'thread_v2,message_reaction,internal_channel_invite,list_record_edited,bot_dm_bundle,at_user,at_user_group,at_channel,at_everyone,keyword,list_record_assigned,list_user_mentioned,list_todo_notification,list_approval_request,list_approval_reviewed,external_channel_invite,external_dm_invite',
        mode: 'priority_reads_and_unreads_v1',
        archive_only: 'false',
        snooze_only: 'false',
        unread_only: 'false',
        priority_only: 'false',
      })

      return await runSlackPost<ActivityFeedResponse>('activity.feed', body)
    },
    async formatter(results) {
      return {
        feed: await formatActivityFeed(results),
      }
    },
  })
