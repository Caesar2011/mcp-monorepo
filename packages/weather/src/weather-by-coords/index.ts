// MCP tool registration for weather-by-coords
import { z } from 'zod'

import { weatherByCoordsHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerWeatherByCoordsTool(server: McpServer) {
  server.registerTool(
    'weather-by-coords',
    {
      title: 'Get Weather by Coordinates',
      description: 'Fetches multi-day and multi-hour weather forecast for a location (lat/lon) using Open-Meteo.',
      inputSchema: {
        latitude: z.number().min(-90).max(90).describe('Latitude, -90 to 90'),
        longitude: z.number().min(-180).max(180).describe('Longitude, -180 to 180'),
      },
    },
    weatherByCoordsHandler,
  )
}
