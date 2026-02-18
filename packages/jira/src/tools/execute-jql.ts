import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getJiraApiVersion } from '../lib/jira-env.js'
import { executeJql } from '../lib/jira.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerExecuteJqlTool = (server: McpServer) =>
  registerTool(server, {
    name: 'execute-jql',
    title: 'Execute Jira JQL',
    description:
      'Execute a Jira Query Language (JQL) search and return issues. In API v3, uses enhanced search with nextPageToken pagination. In API v2, uses legacy search with startAt pagination.',
    inputSchema: {
      jql: z.string().describe('JQL query string'),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of results to return (default: 50)'),
      startAt: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Index of first result for pagination (v2 only, default: 0)'),
      nextPageToken: z.string().optional().describe('Token for next page of results (v3 only)'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Fields to include in results (default: [summary, status, assignee])'),
    },
    outputSchema: {
      total: z.number().optional(), // Not always present in v3
      isLast: z.boolean().optional(), // Only in v3
      nextPageToken: z.string().optional(), // Only in v3
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
      return executeJql(params.jql, params.maxResults, params.startAt, params.fields, params.nextPageToken)
    },
    formatter(data) {
      const apiVersion = getJiraApiVersion()

      // Handle both v2 and v3 responses
      if (apiVersion === '3' && 'isLast' in data) {
        // v3 enhanced search response
        return {
          isLast: data.isLast,
          nextPageToken: data.nextPageToken,
          total: data.total,
          issues: data.issues.map((issue) => ({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status?.name,
          })),
        }
      } else {
        // v2 legacy search response
        return {
          total: data.total,
          issues: data.issues.map((issue) => ({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status?.name,
          })),
        }
      }
    },
  })
