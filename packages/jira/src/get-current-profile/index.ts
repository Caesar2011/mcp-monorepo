/**
 * Tool registration for get-current-profile
 */

import { getCurrentProfileHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGetCurrentProfileTool(server: McpServer): void {
  server.registerTool(
    'get-current-profile',
    {
      title: 'Get Current Jira Profile',
      description: 'Get information about the current authenticated Jira user.',
      inputSchema: {},
    },
    getCurrentProfileHandler,
  )
}
