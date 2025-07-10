/**
 * Tool registration for get-location-by-ip
 */

import { z } from 'zod'

import { getLocationByIpHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGetLocationByIpTool(server: McpServer): void {
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
}
