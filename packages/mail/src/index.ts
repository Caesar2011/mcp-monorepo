// MCP server setup for mail tools
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { registerFetchLatestMailsTool } from './fetch-latest-mails/index.js'
import { registerMarkMailsAsSeenTool } from './mark-mails-as-seen/index.js'
import { registerReadMailTool } from './read-mail/index.js'
import { registerSearchTool } from './search/index.js'

export const server = new McpServer({
  name: 'mail-server',
  version: '1.0.0',
  description: 'MCP server for accessing and querying latest mails from IMAP accounts.',
})

registerFetchLatestMailsTool(server)
registerMarkMailsAsSeenTool(server)
registerReadMailTool(server)
registerSearchTool(server)

const transport = new StdioServerTransport()
server.connect(transport).then(() => {
  console.log('Mail MCP Server connected')
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, disconnecting mail MCP server...')
  await server.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, disconnecting mail MCP server...')
  await server.close()
  process.exit(0)
})
