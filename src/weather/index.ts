import { z } from 'zod'
import { getWeatherHandler } from './weather-by-coords/handler.js'
import { getGeocodingHandler } from './geocoding/handler.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

export const server = new McpServer({
  name: 'weather-mcp-server',
  version: '1.0.0',
  description: 'A server to provide weather forecast information based on latitude and longitude coordinates.',
})

// Register tool for getting weather by coordinates
server.registerTool(
  'get-weather',
  {
    title: 'Get Weather Forecast',
    description: 'Get detailed weather forecast information for a given latitude and longitude.',
    inputSchema: {
      latitude: z.number().min(-90).max(90).describe('Latitude coordinate (-90.000 to 90.000)'),
      longitude: z.number().min(-180).max(180).describe('Longitude coordinate (-180.000 to 180.000)'),
    },
  },
  getWeatherHandler,
)

// Register tool for geocoding locations
server.registerTool(
  'get-geocoding',
  {
    title: 'Get Location Geocoding',
    description: 'Get geographic coordinates and information for a location by name.',
    inputSchema: {
      name: z.string().min(1).describe('Name of the location to search for (enter only one keyword - city OR region, not both)'),
    },
  },
  getGeocodingHandler,
)

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
