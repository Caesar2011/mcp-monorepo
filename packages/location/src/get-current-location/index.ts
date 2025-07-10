/**
 * Tool registration for get-current-location
 */

import { getCurrentLocationHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGetCurrentLocationTool(server: McpServer): void {
  server.registerTool(
    'get-current-location',
    {
      title: 'Get Current Location',
      description: 'Get current location information based on current IP address.',
      inputSchema: {},
    },
    getCurrentLocationHandler,
  )
}
