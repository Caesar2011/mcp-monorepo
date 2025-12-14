import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { type ConfluencePageWithBodyResponse } from './open-page.types.js'
import { requestConfluence } from '../lib/request.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerOpenPageTool = (server: McpServer) =>
  registerTool(server, {
    name: 'open-page',
    title: 'Open Confluence Page',
    description: 'Fetch a Confluence page content by pageId (storage format).',
    inputSchema: {
      pageId: z.string().describe('The Confluence page ID to fetch'),
    },
    outputSchema: {
      id: z.string(),
      type: z.enum(['page', 'global']),
      title: z.string(),
      body: z.string(),
      _expandable: z.record(z.string().optional()),
    },
    isReadOnly: true,
    async fetcher({ pageId }) {
      return await requestConfluence<ConfluencePageWithBodyResponse>({
        endpoint: `/rest/api/content/${pageId}`,
        queryParams: { expand: 'body.storage' },
      })
    },
    formatter(data) {
      return {
        id: `${data.id}`,
        type: data.type,
        title: data.title,
        body: data.body.storage.value,
        _expandable: Object.fromEntries(Object.entries(data._expandable).filter(([, value]) => value)),
      }
    },
  })
