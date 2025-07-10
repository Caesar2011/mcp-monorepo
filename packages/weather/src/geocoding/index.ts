// MCP tool registration for geocoding
import { z } from 'zod'

import { geocodingHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGeocodingTool(server: McpServer) {
  server.registerTool(
    'geocoding',
    {
      title: 'Get Location Coordinates',
      description:
        'Finds the latitude and longitude for a named place (city, town, or landmark) via Open-Meteo geocoding API. Returns results for ambiguous names.',
      inputSchema: {
        name: z.string().min(1, 'Location name required').describe('Name of a city or location'),
      },
    },
    geocodingHandler,
  )
}
