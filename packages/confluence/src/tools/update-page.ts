import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getConfluenceApiVersion } from '../lib/confluence-env.js'
import { getPage, updatePage } from '../lib/confluence.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerUpdatePageTool = (server: McpServer) =>
  registerTool(server, {
    name: 'update-page',
    title: 'Update Confluence Page',
    description:
      'Update the title and/or content of a Confluence page. In API v2, content should be Markdown (auto-converted to ADF). In API v1, content should be storage HTML format.',
    inputSchema: {
      pageId: z.string().describe('The Confluence page ID to update'),
      newTitle: z.string().describe('The new title for the page'),
      newContent: z.string().describe('The new content for the page (Markdown in v2, storage HTML in v1)'),
    },
    outputSchema: {
      id: z.string(),
      title: z.string(),
      spaceKey: z.string(),
      webUrl: z.string(),
      version: z.number(),
    },
    isReadOnly: false,
    async fetcher({ pageId, newTitle, newContent }) {
      // Get current page to retrieve version number
      const currentPage = await getPage(pageId)

      return await updatePage(pageId, {
        title: newTitle,
        content: newContent,
        version: currentPage.version,
      })
    },
    formatter(data) {
      const apiVersion = getConfluenceApiVersion()
      return {
        id: data.id,
        title: data.title,
        spaceKey: data.spaceKey,
        webUrl: data.webUrl,
        version: data.version,
        format: apiVersion === '2' ? 'markdown' : 'storage-html',
      }
    },
  })
