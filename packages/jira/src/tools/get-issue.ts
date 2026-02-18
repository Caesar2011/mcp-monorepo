import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { adfToMd } from '../lib/adf-utils.js'
import { getIssue } from '../lib/jira.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerGetIssueTool = (server: McpServer) =>
  registerTool(server, {
    name: 'get-issue',
    title: 'Get Jira Issue',
    description: 'Fetch a Jira issue and its details by key or ID.',
    inputSchema: {
      issueIdOrKey: z.string().describe('Jira issue key or numeric ID'),
      fields: z.array(z.string()).optional().describe('Fields to include in response (default: all available)'),
      expand: z.array(z.string()).optional().describe('Fields to expand (e.g., comments, changelog)'),
    },
    outputSchema: {
      key: z.string(),
      summary: z.string().optional(),
      status: z.string().optional(),
      assignee: z.string().optional(),
      description: z.string().optional(), // Always markdown (converted from ADF in v3)
    },
    isReadOnly: true,
    async fetcher({ issueIdOrKey, fields, expand }) {
      return getIssue(issueIdOrKey, fields, expand)
    },
    formatter(data) {
      return {
        key: data.key,
        summary: data.fields.summary,
        status: data.fields.status?.name,
        assignee: data.fields.assignee?.displayName,
        description: adfToMd(data.fields.description), // Convert ADF to Markdown
      }
    },
  })
