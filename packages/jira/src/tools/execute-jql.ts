import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { executeJql } from '../lib/jira.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerExecuteJqlTool = (server: McpServer) =>
  registerTool(server, {
    name: 'execute-jql',
    title: 'Execute Jira JQL',
    description: 'Execute a Jira Query Language (JQL) search and return issues.',
    inputSchema: {
      jql: z.string().describe('JQL query string'),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of results to return (default: 50)'),
      startAt: z.number().int().min(0).optional().describe('Index of first result for pagination (default: 0)'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Fields to include in results (default: [summary, status, assignee])'),
    },
    outputSchema: {
      total: z.number(),
      issues: z.array(
        z.object({
          key: z.string(),
          summary: z.string().optional(),
          status: z.string().optional(),
        }),
      ),
    },
    isReadOnly: true,
    async fetcher(params) {
      return executeJql(params.jql, params.maxResults, params.startAt, params.fields)
    },
    formatter(data) {
      return {
        total: data.total,
        issues: data.issues.map((issue) => ({
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status?.name,
        })),
      }
    },
  })
