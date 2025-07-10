import { z } from 'zod'

import { toolHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGetCurrentDatetimeTool(server: McpServer): void {
  server.registerTool(
    'get-current-datetime',
    {
      title: 'Get current date and time',
      description: 'Returns the current date and time in various formats.',
      inputSchema: {
        format: z
          .enum(['iso', 'local', 'utc', 'timestamp'])
          .default('local')
          .describe('Output format: iso, local, utc, or timestamp'),
      },
    },
    toolHandler,
  )
}
