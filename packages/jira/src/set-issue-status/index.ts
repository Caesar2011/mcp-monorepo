/**
 * Tool registration for set-issue-status
 */

import { z } from 'zod'

import { setIssueStatusHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerSetIssueStatusTool(server: McpServer): void {
  server.registerTool(
    'set-issue-status',
    {
      title: 'Set Jira Issue Status',
      description: 'Transition a Jira issue to a new status by status name or transition ID.',
      inputSchema: {
        issueIdOrKey: z.string().describe('Jira issue key or numeric ID'),
        status: z.string().optional().describe('Target status name (e.g., Done, In Progress, To Do)'),
        transitionId: z.string().optional().describe('Transition ID (if known; takes precedence over status name)'),
        comment: z.string().optional().describe('Comment to add with the transition'),
      },
    },
    setIssueStatusHandler,
  )
}
