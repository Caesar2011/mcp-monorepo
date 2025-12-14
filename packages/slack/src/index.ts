#!/usr/bin/env node

import { createMcpServer } from '@mcp-monorepo/shared'
import { logger } from '@mcp-monorepo/shared'

import { preloadChannelListCache } from './lib/channel-cache.js'
import { preloadMemberListCache } from './lib/user-cache.js'
import { registerGetActivityFeedTool } from './tools/get-activity-feed.js'
import { registerGetChannelContentTool } from './tools/get-channel-contnent.js'
import { registerGetChannelInfoTool } from './tools/get-channel-info.js'
import { registerGetChannelSidebarTool } from './tools/get-channel-sidebar.js'
import { registerGetDmListTool } from './tools/get-dm-list.js'
import { registerSearchChannelTool } from './tools/search-channel.js'

createMcpServer({
  name: 'slack',
  importMetaPath: import.meta.filename,
  title: 'Slack MCP Server',
  tools: [
    registerGetDmListTool,
    registerSearchChannelTool,
    registerGetChannelInfoTool,
    registerGetActivityFeedTool,
    registerGetChannelContentTool,
    registerGetChannelSidebarTool,
  ],
})

preloadChannelListCache().catch((e) => {
  logger.error('Failed to preload channel list cache', e)
})
preloadMemberListCache().catch((e) => {
  logger.error('Failed to preload member list cache', e)
})
