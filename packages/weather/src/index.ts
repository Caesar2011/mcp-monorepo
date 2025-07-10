import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { registerGeocodingTool } from './geocoding/index.js'
import { registerWeatherByCoordsTool } from './weather-by-coords/index.js'

// Create MCP server instance
export const server = new McpServer({
  name: 'weather-mcp-server',
  version: '1.0.0',
  description: 'A server to provide weather and geocoding information.',
})

// Register all weather tools
registerGeocodingTool(server)
registerWeatherByCoordsTool(server)

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport()
server
  .connect(transport)
  .then(() => {
    console.log('weather-mcp-server connected and listening on stdio.')
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
