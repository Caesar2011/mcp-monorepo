import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getCreateMetadata } from '../lib/jira.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerGetCreateMetadataTool = (server: McpServer) =>
  registerTool(server, {
    name: 'get-create-metadata',
    title: 'Get Jira Create Issue Metadata',
    description:
      'Get metadata about fields required to create issues in a project. Returns issue types, priorities, and field requirements. Use this to find valid issueTypeId and priorityId values for creating issues.',
    inputSchema: {
      projectKey: z.string().optional().describe('Filter by project key (e.g., "PROJ")'),
      issueTypeId: z.string().optional().describe('Filter by specific issue type ID'),
    },
    outputSchema: {
      projects: z.array(
        z.object({
          key: z.string(),
          name: z.string(),
          issueTypes: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              subtask: z.boolean(),
              requiredFields: z.array(z.string()),
              availablePriorities: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
            }),
          ),
        }),
      ),
    },
    isReadOnly: true,
    async fetcher(params) {
      return getCreateMetadata(params.projectKey, params.issueTypeId)
    },
    formatter(data) {
      // Filter response to only show essential information
      return {
        projects: data.projects.map((project) => ({
          key: project.key,
          name: project.name,
          issueTypes: project.issuetypes.map((issueType) => {
            const fields = issueType.fields

            // Extract required fields
            const requiredFields = Object.entries(fields)
              .filter(([, meta]) => meta.required)
              .map(([key]) => key)

            // Extract priorities if available
            const priorityField = fields.priority
            const availablePriorities = priorityField?.allowedValues?.map((p) => ({
              id: p.id ?? '',
              name: p.name ?? '',
            }))

            return {
              id: issueType.id,
              name: issueType.name,
              subtask: issueType.subtask,
              requiredFields,
              ...(availablePriorities && availablePriorities.length > 0 && { availablePriorities }),
            }
          }),
        })),
      }
    },
  })
