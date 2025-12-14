import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getLatestProjects } from '../lib/jira.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerGetLatestProjectsTool = (server: McpServer) =>
  registerTool(server, {
    name: 'get-latest-projects',
    title: 'Get Latest Jira Projects',
    description: 'Retrieve the most recently created Jira projects visible to the current user.',
    inputSchema: {
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of projects to return (default: 10)'),
    },
    outputSchema: {
      total: z.number(),
      projects: z.array(
        z.object({
          key: z.string(),
          name: z.string(),
        }),
      ),
    },
    isReadOnly: true,
    async fetcher({ maxResults }) {
      return getLatestProjects(maxResults)
    },
    formatter(data) {
      return {
        total: data.total,
        projects: data.values.map((p) => ({ key: p.key, name: p.name })),
      }
    },
  })
