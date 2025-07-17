/**
 * Tool registration for get-latest-projects
 */

import { z } from 'zod'

import { getLatestProjectsHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGetLatestProjectsTool(server: McpServer): void {
  server.registerTool(
    'get-latest-projects',
    {
      title: 'Get Latest Jira Projects',
      description: 'Retrieve the most recently created Jira projects visible to the current user.',
      inputSchema: {
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe('Maximum number of projects to return (default: 10)'),
      },
    },
    getLatestProjectsHandler,
  )
}
