import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getJiraBaseUrl } from '../lib/jira-env.js'
import { updateIssue } from '../lib/jira.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerUpdateIssueTool = (server: McpServer) =>
  registerTool(server, {
    name: 'update-issue',
    title: 'Update Jira Issue',
    description:
      'Update fields of an existing Jira issue. Only provided fields will be updated, others remain unchanged.',
    inputSchema: {
      issueIdOrKey: z.string().describe('Issue key or ID (e.g., "PROJ-123")'),
      summary: z.string().optional().describe('New issue title/summary'),
      description: z
        .string()
        .optional()
        .describe('New description (supports Markdown formatting in API v3, plain text in v2)'),
      assigneeId: z
        .string()
        .optional()
        .nullable()
        .describe('Assignee account ID (null to unassign, undefined to leave unchanged)'),
      priorityId: z.string().optional().describe('New priority ID'),
      labels: z.array(z.string()).optional().describe('New labels (replaces existing labels)'),
    },
    outputSchema: {
      success: z.boolean(),
      issueKey: z.string(),
      url: z.string(),
    },
    isReadOnly: false,
    async fetcher(params) {
      const { issueIdOrKey, ...updates } = params
      await updateIssue(issueIdOrKey, updates)
      return { issueIdOrKey }
    },
    formatter(data) {
      return {
        success: true,
        issueKey: data.issueIdOrKey,
        url: `${getJiraBaseUrl()}/browse/${data.issueIdOrKey}`,
      }
    },
  })
