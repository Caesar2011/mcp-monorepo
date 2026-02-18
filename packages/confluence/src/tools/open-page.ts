import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getConfluenceApiVersion } from '../lib/confluence-env.js'
import { getPage } from '../lib/confluence.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerOpenPageTool = (server: McpServer) =>
  registerTool(server, {
    name: 'open-page',
    title: 'Open Confluence Page',
    description:
      'Fetch a Confluence page content by pageId. Returns Markdown format in v2 (converted from ADF), storage HTML format in v1.',
    inputSchema: {
      pageId: z.string().describe('The Confluence page ID to fetch'),
    },
    outputSchema: {
      id: z.string(),
      title: z.string(),
      spaceKey: z.string(),
      webUrl: z.string(),
      content: z.string().optional(),
      version: z.number(),
    },
    isReadOnly: true,
    async fetcher({ pageId }) {
      return await getPage(pageId)
    },
    formatter(data) {
      const apiVersion = getConfluenceApiVersion()
      return {
        id: data.id,
        title: data.title,
        spaceKey: data.spaceKey,
        webUrl: data.webUrl,
        content: data.content,
        version: data.version,
        format: apiVersion === '2' ? 'markdown' : 'storage-html',
      }
    },
  })
