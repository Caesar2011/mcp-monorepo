import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getJiraBaseUrl } from '../lib/jira-env.js'
import { createIssue } from '../lib/jira.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerCreateIssueTool = (server: McpServer) =>
  registerTool(server, {
    name: 'create-issue',
    title: 'Create Jira Issue',
    description:
      'Create a new Jira issue. Use get-create-metadata to find valid issueTypeId and priorityId values for your project.',
    inputSchema: {
      projectKey: z.string().describe('Project key (e.g., "PROJ")'),
      issueTypeId: z.string().describe('Issue type ID (use get-create-metadata to find valid IDs)'),
      summary: z.string().describe('Issue title/summary'),
      description: z
        .string()
        .optional()
        .describe('Issue description (supports Markdown formatting in API v3, plain text in v2)'),
      assigneeId: z.string().optional().describe('Assignee account ID (leave empty for unassigned)'),
      priorityId: z.string().optional().describe('Priority ID (use get-create-metadata to find valid IDs)'),
      labels: z.array(z.string()).optional().describe('Labels for the issue'),
      parentKey: z.string().optional().describe('Parent issue key (required for creating subtasks)'),
    },
    outputSchema: {
      id: z.string(),
      key: z.string(),
      url: z.string(),
    },
    isReadOnly: false,
    async fetcher(params) {
      return createIssue({
        projectKey: params.projectKey,
        issueTypeId: params.issueTypeId,
        summary: params.summary,
        description: params.description,
        assigneeId: params.assigneeId,
        priorityId: params.priorityId,
        labels: params.labels,
        parentKey: params.parentKey,
      })
    },
    formatter(data) {
      return {
        id: data.id,
        key: data.key,
        url: `${getJiraBaseUrl()}/browse/${data.key}`,
      }
    },
  })
