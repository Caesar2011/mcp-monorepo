/**
 * Confluence MCP Server - Main entry point
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { registerCreatePageTool } from './create-page/index.js'
import { registerListSpacePagesTool } from './list-space-pages/index.js'
import { registerListSpacesTool } from './list-spaces/index.js'
import { registerOpenPageTool } from './open-page/index.js'
import { registerSearchCqlTool } from './search-cql/index.js'
import { registerUpdatePageTool } from './update-page/index.js'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// Create MCP server instance
export const server = new McpServer({
  name: 'confluence-mcp-server',
  version: '1.0.0',
  description: 'A server to provide Confluence query and page tools.',
})

// Register all Confluence tools
registerOpenPageTool(server)
registerSearchCqlTool(server)
registerListSpacePagesTool(server)
registerListSpacesTool(server)
registerCreatePageTool(server)
registerUpdatePageTool(server)

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport()
server
  .connect(transport)
  .then(() => {
    console.log('confluence-mcp-server connected and listening on stdio.')
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
