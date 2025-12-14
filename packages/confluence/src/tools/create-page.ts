import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { requestConfluence } from '../lib/request.js'

import type { ConfluenceCreatePageResponse } from './create-page.types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerCreatePageTool = (server: McpServer) =>
  registerTool(server, {
    name: 'create-page',
    title: 'Create Confluence Page',
    description: 'Create a new page in Confluence.',
    inputSchema: {
      spaceKey: z.string().describe('The Confluence space key'),
      title: z.string().describe('The title of the new page'),
      content: z.string().describe('The content of the new page (in storage format)'),
      parentId: z.string().describe('Optional parent page ID').optional(),
    },
    outputSchema: {
      page: z.object({
        id: z.string(),
        type: z.string(),
        status: z.string(),
        title: z.string(),
      }),
    },
    isReadOnly: false,
    async fetcher({ spaceKey, title, content, parentId }) {
      const requestBody: Record<string, unknown> = {
        type: 'page',
        title,
        space: { key: spaceKey },
        body: {
          storage: {
            value: content,
            representation: 'storage',
          },
        },
        ...(parentId ? { ancestors: [{ id: parentId }] } : {}),
      }

      return await requestConfluence<ConfluenceCreatePageResponse>({
        endpoint: '/rest/api/content',
        method: 'POST',
        body: requestBody,
      })
    },
    formatter(data) {
      return {
        page: {
          id: `${data.id}`,
          type: data.type,
          status: data.status,
          title: data.title,
        },
      }
    },
  })
