import { getActivityFeedHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGetActivityFeedTool(server: McpServer): void {
  server.registerTool(
    'get-activity-feed',
    {
      title: 'Get Activity Feed',
      description: 'Fetches the latest activity/events from Slack (threads, mentions, reactions, etc).',
      inputSchema: {},
    },
    getActivityFeedHandler,
  )
}
