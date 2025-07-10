import { z } from 'zod'

import { toolHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerFetchEventsTool(server: McpServer): void {
  server.registerTool(
    'fetch-events',
    {
      title: 'Fetch calendar events',
      description: 'Fetch calendar events from all configured ICS URLs for a specified time period.',
      inputSchema: {
        startDate: z.string().describe('Start date in YYYY-MM-DD format'),
        endDate: z.string().describe('End date in YYYY-MM-DD format'),
        limit: z.number().default(50).describe('Maximum number of events to return (default: 50)'),
      },
    },
    toolHandler,
  )
}
