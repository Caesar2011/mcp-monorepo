import { z } from 'zod'
import { getCurrentLocationHandler, getLocationByIpHandler } from './handler.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

export const server = new McpServer({
  name: 'location-mcp-server',
  version: '1.0.0',
  description: 'A server to provide location information based on IP address.',
})

// Register tool for getting current location (no input required)
server.registerTool(
  'get-current-location',
  {
    title: 'Get Current Location',
    description: 'Get current location information based on current IP address.',
    inputSchema: {},
  },
  getCurrentLocationHandler,
)

// Register tool for getting location by IP address
server.registerTool(
  'get-location-by-ip',
  {
    title: 'Get Location by IP',
    description: 'Get location information for a given IP address.',
    inputSchema: {
      ipAddress: z.string().describe('IP address to lookup location information.'),
    },
  },
  getLocationByIpHandler,
)

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport()
server
  .connect(transport)
  .then(() => {
    console.log('file-browser-mcp-server connected and listening on stdio.')
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
