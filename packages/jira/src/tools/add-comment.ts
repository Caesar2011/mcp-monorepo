import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getJiraBaseUrl } from '../lib/jira-env.js'
import { addComment } from '../lib/jira.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerAddCommentTool = (server: McpServer) =>
  registerTool(server, {
    name: 'add-comment',
    title: 'Add Comment to Jira Issue',
    description: 'Add a comment to an existing Jira issue.',
    inputSchema: {
      issueIdOrKey: z.string().describe('Issue key or ID (e.g., "PROJ-123")'),
      comment: z.string().describe('Comment text (supports Markdown formatting in API v3, plain text in v2)'),
      visibility: z
        .object({
          type: z.enum(['role', 'group']).describe('Visibility type: role or group'),
          value: z.string().describe('Role name or group name'),
        })
        .optional()
        .describe('Restrict comment visibility to a specific role or group (optional)'),
    },
    outputSchema: {
      commentId: z.string(),
      created: z.string(),
      url: z.string(),
    },
    isReadOnly: false,
    async fetcher(params) {
      const comment = await addComment(params.issueIdOrKey, params.comment, params.visibility)
      return { comment, issueIdOrKey: params.issueIdOrKey }
    },
    formatter(data) {
      return {
        commentId: data.comment.id,
        created: data.comment.created,
        url: `${getJiraBaseUrl()}/browse/${data.issueIdOrKey}?focusedCommentId=${data.comment.id}`,
      }
    },
  })
