import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { requestConfluence } from '../lib/request.js'

import type { ConfluencePageResponse, ConfluenceUpdatePageResponse } from './update-page.types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerUpdatePageTool = (server: McpServer) =>
  registerTool(server, {
    name: 'update-page',
    title: 'Update Confluence Page',
    description: 'Update the title and/or content of a Confluence page.',
    inputSchema: {
      pageId: z.string().describe('The Confluence page ID to update'),
      newTitle: z.string().describe('The new title for the page'),
      newContent: z.string().describe('The new content for the page (in storage format)'),
      currentVersionNumber: z
        .number()
        .int()
        .min(1)
        .describe('Current version number of the page (retrieved from latest page GET)'),
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
    async fetcher({ pageId, newTitle, newContent }) {
      const currentPage = await requestConfluence<ConfluencePageResponse>({
        endpoint: `/rest/api/content/${pageId}`,
      })
      const requestBody: Record<string, unknown> = {
        id: pageId,
        type: 'page',
        title: newTitle,
        version: {
          number: currentPage.version.number + 1,
        },
        body: {
          storage: {
            value: newContent,
            representation: 'storage',
          },
        },
      }

      return await requestConfluence<ConfluenceUpdatePageResponse>({
        endpoint: `/rest/api/content/${encodeURIComponent(pageId)}`,
        method: 'PUT',
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
