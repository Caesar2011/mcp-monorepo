/**
 * Jira MCP Server - Main entry point
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { registerExecuteJqlTool } from './execute-jql/index.js'
import { registerGetCurrentProfileTool } from './get-current-profile/index.js'
import { registerGetIssueTool } from './get-issue/index.js'
import { registerGetLatestProjectsTool } from './get-latest-projects/index.js'
import { registerGetTicketTransitionsTool } from './get-ticket-transitions/index.js'
import { registerSetIssueStatusTool } from './set-issue-status/index.js'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// Create MCP server instance
export const server = new McpServer({
  name: 'jira-mcp-server',
  version: '1.0.0',
  description: 'A server to provide Jira query and issue tools.',
})

// Register all Jira tools
registerGetCurrentProfileTool(server)
registerExecuteJqlTool(server)
registerGetLatestProjectsTool(server)
registerGetIssueTool(server)
registerSetIssueStatusTool(server)
registerGetTicketTransitionsTool(server)

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport()
server
  .connect(transport)
  .then(() => {
    console.log('jira-mcp-server connected and listening on stdio.')
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
