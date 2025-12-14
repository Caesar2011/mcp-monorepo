import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getTicketTransitions } from '../lib/jira.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerGetTicketTransitionsTool = (server: McpServer) =>
  registerTool(server, {
    name: 'get-ticket-transitions',
    title: 'Get Jira Ticket Transitions',
    description: 'List all possible status transitions for a given Jira issue (name and ID).',
    inputSchema: {
      issueIdOrKey: z.string().describe('Jira issue key or numeric ID'),
    },
    outputSchema: {
      transitions: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          toStatus: z.string(),
        }),
      ),
    },
    isReadOnly: true,
    async fetcher({ issueIdOrKey }) {
      return getTicketTransitions(issueIdOrKey)
    },
    formatter(data) {
      return {
        transitions: data.transitions.map((t) => ({
          id: t.id,
          name: t.name,
          toStatus: t.to.name,
        })),
      }
    },
  })
