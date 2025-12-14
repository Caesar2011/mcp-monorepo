import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { findTransitionIdByName, setIssueStatus } from '../lib/jira.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerSetIssueStatusTool = (server: McpServer) =>
  registerTool(server, {
    name: 'set-issue-status',
    title: 'Set Jira Issue Status',
    description: 'Transition a Jira issue to a new status by status name or transition ID.',
    inputSchema: {
      issueIdOrKey: z.string().describe('Jira issue key or numeric ID'),
      status: z.string().optional().describe('Target status name (e.g., Done, In Progress, To Do)'),
      transitionId: z.string().optional().describe('Transition ID (if known; takes precedence over status name)'),
      comment: z.string().optional().describe('Comment to add with the transition'),
    },
    outputSchema: {
      message: z.string(),
    },
    isDestructive: true,
    async fetcher({ issueIdOrKey, status, transitionId, comment }) {
      let finalTransitionId = transitionId
      if (!finalTransitionId && status) {
        finalTransitionId = await findTransitionIdByName(issueIdOrKey, status)
        if (!finalTransitionId) {
          throw new Error(`No transition found for status: ${status}`)
        }
      }

      if (!finalTransitionId) {
        throw new Error('Either transitionId or a valid status name must be provided.')
      }

      await setIssueStatus(issueIdOrKey, finalTransitionId, comment)
      return `Issue ${issueIdOrKey} transitioned successfully${status ? ` to status: ${status}` : ''}.`
    },
    formatter(message) {
      return { message }
    },
  })
