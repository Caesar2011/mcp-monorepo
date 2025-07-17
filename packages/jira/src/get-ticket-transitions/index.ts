/**
 * Tool registration for get-ticket-transitions
 */

import { z } from 'zod'

import { getTicketTransitionsHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGetTicketTransitionsTool(server: McpServer): void {
  server.registerTool(
    'get-ticket-transitions',
    {
      title: 'Get Jira Ticket Transitions',
      description: 'List all possible status transitions for a given Jira issue (name and ID).',
      inputSchema: {
        issueIdOrKey: z.string().describe('Jira issue key or numeric ID'),
      },
    },
    getTicketTransitionsHandler,
  )
}
