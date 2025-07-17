/**
 * Tool registration for get-issue
 */

import { z } from 'zod'

import { getIssueHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGetIssueTool(server: McpServer): void {
  server.registerTool(
    'get-issue',
    {
      title: 'Get Jira Issue',
      description: 'Fetch a Jira issue and its details by key or ID.',
      inputSchema: {
        issueIdOrKey: z.string().describe('Jira issue key or numeric ID'),
        fields: z.array(z.string()).optional().describe('Fields to include in response (default: all available)'),
        expand: z.array(z.string()).optional().describe('Fields to expand (e.g., comments, changelog)'),
      },
    },
    getIssueHandler,
  )
}
