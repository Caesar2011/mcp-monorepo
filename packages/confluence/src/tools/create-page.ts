import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getConfluenceApiVersion } from '../lib/confluence-env.js'
import { createPage } from '../lib/confluence.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerCreatePageTool = (server: McpServer) =>
  registerTool(server, {
    name: 'create-page',
    title: 'Create Confluence Page',
    description:
      'Create a new page in Confluence. In API v2, content should be Markdown (auto-converted to ADF). In API v1, content should be storage HTML format.',
    inputSchema: {
      spaceKey: z.string().describe('The Confluence space key'),
      title: z.string().describe('The title of the new page'),
      content: z.string().describe('The content of the new page (Markdown in v2, storage HTML in v1)'),
      parentId: z.string().describe('Optional parent page ID').optional(),
    },
    outputSchema: {
      id: z.string(),
      title: z.string(),
      spaceKey: z.string(),
      webUrl: z.string(),
      version: z.number(),
    },
    isReadOnly: false,
    async fetcher({ spaceKey, title, content, parentId }) {
      return await createPage({
        spaceKey,
        title,
        content,
        parentId,
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
