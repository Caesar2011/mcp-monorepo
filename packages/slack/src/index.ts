#!/usr/bin/env node

import { createMcpServer, logger } from '@mcp-monorepo/shared'

import { preloadChannelListCache } from './lib/channel-cache.js'
import { preloadMemberListCache } from './lib/user-cache.js'
import { registerGetActivityFeedTool } from './tools/get-activity-feed.js'
import { registerGetChannelContentTool } from './tools/get-channel-content.js'
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
  async onReady() {
    logger.info('Pre-warming Slack channel and member caches...')
    try {
      // Preload caches in parallel to speed up startup.
      await Promise.all([preloadChannelListCache(), preloadMemberListCache()])
      logger.info('Slack caches pre-warmed successfully.')
    } catch (e) {
      logger.error('Failed to pre-warm Slack caches. The server will start in a degraded state.', e)
      // We don't rethrow, allowing the server to run but with slower initial API calls.
    }
  },
})
