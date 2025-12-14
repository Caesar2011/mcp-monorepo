import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerNotionQueryTool = (server: McpServer) =>
  registerTool(server, {
    name: 'notion-query',
    title: 'Query a Notion Data Source',
    description: `Gets a list of pages from a data source, identified by its URL (e.g., "collection://<uuid>"). Supports filtering and sorting. The response is paginated; use 'start_cursor' for subsequent requests if 'next_cursor' is returned. Filters operate on properties and can be simple or compound (using "and"/"or"). Sorts operate on properties or timestamps. For performance, use 'filter_properties' to retrieve only necessary page properties. Refer to Notion API documentation for the exact filter and sort object structures.`,
    inputSchema: {
      data_source_url: z
        .string()
        .describe('The URL of the data source to query, e.g., "collection://f336d0bc-b841-465b-8045-024475c079dd".'),
      filter: z
        .any()
        .optional()
        .describe(
          'A JSON filter object to apply. Example: {"property": "Done", "checkbox": {"equals": true}} or {"and": [...]}.',
        ),
      sorts: z
        .array(z.any())
        .optional()
        .describe('An array of JSON sort objects. Example: [{"property": "Name", "direction": "ascending"}].'),
      start_cursor: z.string().optional().describe('If provided, starts the query at the specified cursor.'),
      page_size: z.number().optional().describe('The number of items to return (max 100).'),
      filter_properties: z
        .array(z.string())
        .optional()
        .describe('An array of property IDs or names to return. If not provided, all properties are returned.'),
    },
    outputSchema: {
      results: z.array(z.any()).describe('An array of page objects matching the query.'),
      next_cursor: z
        .string()
        .nullable()
        .describe('The cursor for the next page of results, or null if there are no more results.'),
      has_more: z.boolean().describe('Whether there are more results available.'),
    },
    isReadOnly: true,
    async fetcher(args) {
      const { data_source_url, filter, sorts, start_cursor, page_size, filter_properties } = args

      if (!data_source_url?.startsWith('collection://')) {
        throw new Error('Invalid data_source_url format. Must start with "collection://".')
      }

      const dataSourceId = data_source_url.substring('collection://'.length)

      const NOTION_API_KEY = process.env.NOTION_API_KEY
      if (!NOTION_API_KEY) {
        throw new Error('NOTION_API_KEY environment variable is not set.')
      }

      const apiUrl = new URL(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`)

      if (filter_properties && filter_properties.length > 0) {
        filter_properties.forEach((prop) => {
          apiUrl.searchParams.append('filter_properties', prop)
        })
      }

      const body: Record<string, unknown> = {}
      if (filter) body.filter = filter
      if (sorts) body.sorts = sorts
      if (start_cursor) body.start_cursor = start_cursor
      if (page_size) body.page_size = page_size

      const response = await fetch(apiUrl.toString(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': '2025-09-03',
          'Content-Type': 'application/json',
        },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Notion API request failed with status ${response.status}: ${errorText}`)
      }

      return (await response.json()) as { results: unknown[]; next_cursor: string | null; has_more: boolean }
    },
    formatter(data) {
      return {
        results: data.results,
        next_cursor: data.next_cursor,
        has_more: data.has_more,
      }
    },
  })
