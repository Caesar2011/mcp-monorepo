import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { registerRememberAllMemoriesTool } from './remember-all-memories/index.js'
import { registerRemoveMemoryTool } from './remove/index.js'
import { registerSearchMemoriesTool } from './search-memories/index.js'
import { registerStoreLongTermMemoryTool } from './store-long-term/index.js'
import { registerStoreMidTermMemoryTool } from './store-mid-term/index.js'
import { registerStoreShortTermMemoryTool } from './store-short-term/index.js'

const server = new McpServer({
  name: 'memory-mcp-server',
  version: '1.0.0',
  description:
    'A comprehensive memory management system that automatically stores and retrieves personal preferences, decisions, moods, and plans across different time horizons. The remember-all-memories tool MUST always be called whenever memory context is not yet present; it ensures complete context and safe, correct reasoning for all downstream steps. Short-term memories (7 days) capture moods and immediate decisions, mid-term memories (3 months) store plans and evolving preferences, while long-term memories preserve personal preferences indefinitely. Every decision you make must be stored automatically, even without explicitly asking. This tool distinguishes between memories (personal preferences, plans, moods - both personal and business) and tasks (concrete action points).',
})

registerStoreShortTermMemoryTool(server)
registerStoreMidTermMemoryTool(server)
registerStoreLongTermMemoryTool(server)
registerRemoveMemoryTool(server)
registerSearchMemoriesTool(server)
registerRememberAllMemoriesTool(server)

const transport = new StdioServerTransport()
server
  .connect(transport)
  .then(() => {
    console.log('memory-mcp-server connected and listening on stdio.')
  })
  .catch((error: Error) => {
    console.error('Failed to connect MCP server:', error)
    process.exit(1)
  })

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
