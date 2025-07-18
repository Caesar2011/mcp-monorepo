/**
 * Slack MCP Server - Main entry point
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { registerGetActivityFeedTool } from './get-activity-feed/index.js'
import { registerGetChannelContentTool } from './get-channel-content/index.js'
import { registerGetChannelInfoTool } from './get-channel-info/index.js'
import { registerGetChannelSidebarTool } from './get-channel-sidebar/index.js'
import { registerGetDmListTool } from './get-dm-list/index.js'
import { preloadChannelListCache } from './lib/channel-cache.js'
import { registerSearchChannelTool } from './search-channel/index.js'

// Create MCP server instance
export const server = new McpServer({
  name: 'slack-mcp-server',
  version: '1.0.0',
  description: 'A server to provide Slack information and actions.',
})

// Preload (init) channel cache on server start
preloadChannelListCache().catch((e) => {
  console.error('Failed to preload channel list cache', e)
})

// Register all Slack tools
registerGetChannelSidebarTool(server)
registerGetActivityFeedTool(server)
registerGetDmListTool(server)
registerSearchChannelTool(server)
registerGetChannelInfoTool(server)
registerGetChannelContentTool(server)

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport()
server
  .connect(transport)
  .then(() => {
    console.log('slack-mcp-server connected and listening on stdio.')
  })
  .catch((error) => {
    console.error('Failed to connect MCP server:', error)
    process.exit(1)
  })

// Graceful shutdown on process exit
process.on('SIGINT', async () => {
  console.log('SIGINT received, disconnecting server...')
  await server.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, disconnecting server...')
  await server.close()
  process.exit(0)
})
