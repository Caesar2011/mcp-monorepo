import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { formatDate } from '../lib/format-date.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerGetCurrentDatetimeTool = (server: McpServer) =>
  registerTool(server, {
    name: 'get-current-datetime',
    title: 'Get current date and time',
    description: 'Returns the current date and time in local format.',
    inputSchema: {},
    outputSchema: {
      localDate: z.string(),
      timestamp: z.number(),
    },
    isReadOnly: true,
    async fetcher() {
      return new Date()
    },
    formatter(date) {
      return {
        localDate: formatDate(date, false),
        timestamp: date.valueOf(),
      }
    },
  })
