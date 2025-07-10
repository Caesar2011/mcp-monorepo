import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { registerFetchEventsTool } from './fetch-events/index.js'
import { registerGetCurrentDatetimeTool } from './get-current-datetime/index.js'

const server = new McpServer({
  name: 'calendar-mcp-server',
  version: '1.0.0',
  description: 'A server to interact with multiple ICS calendar URLs and fetch events for specified periods.',
})

registerGetCurrentDatetimeTool(server)
registerFetchEventsTool(server)

const transport = new StdioServerTransport()
server.connect(transport).then(() => {
  console.log('calendar-mcp-server connected and listening on stdio.')
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
