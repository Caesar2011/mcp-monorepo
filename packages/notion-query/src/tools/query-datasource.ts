import { registerTool } from '@mcp-monorepo/shared'
import { type QueryDataSourceParameters } from '@notionhq/client'
import { z } from 'zod'

import { getNotionClient } from '../lib/client.js'
import { simplifyNotionPages } from '../lib/parser.js'
import { type ToolServices } from '../lib/types.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerQueryDatasourceTool = (server: McpServer, services: ToolServices) =>
  registerTool(server, {
    name: 'query-datasource',
    title: 'Query a Notion Data Source',
    description: `Gets a list of pages from a data source, identified by its URL (e.g., "collection://<uuid>"). Supports filtering and sorting. The response is paginated; use 'start_cursor' for subsequent requests if 'next_cursor' is returned. Filters operate on properties and can be simple or compound (using "and"/"or"). Sorts operate on properties or timestamps. For performance, you can use 'filter_properties' to retrieve only necessary page properties. Refer to Notion API documentation for the exact filter and sort object structures.`,
    inputSchema: {
      data_source_url: z
        .string()
        .describe('The URL of the data source to query, e.g., "collection://f336d0bc-b841-465b-8045-024475c079dd".'),
      filter: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'A JSON filter object to apply. Example: {"property": "Done", "checkbox": {"equals": true}} or {"and": [...]}.',
        ),
      sorts: z
        .array(
          z.object({
            property: z.string().optional(),
            timestamp: z.string().optional(),
            direction: z.enum(['ascending', 'descending']),
          }),
        )
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
      results: z
        .array(z.record(z.string(), z.any()))
        .describe('An array of simplified page objects. Each object is a flat key-value map of its properties.'),
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

      const notion = getNotionClient()
      const dataSourceId = data_source_url.substring('collection://'.length)

      try {
        return await notion.dataSources.query({
          data_source_id: dataSourceId,
          filter: filter as QueryDataSourceParameters['filter'],
          sorts: sorts as QueryDataSourceParameters['sorts'],
          start_cursor,
          page_size,
          filter_properties,
        })
      } catch (error: unknown) {
        if (error instanceof Error) {
          throw new Error(`Notion API request failed: ${error.message}`)
        }
        throw new Error('An unknown Notion API error occurred.')
      }
    },
    async formatter(data) {
      await Promise.allSettled(
        data.results.map((pageOrDatasource) => services.notionSyncer?.triggerImmediateSync(pageOrDatasource.id)),
      )
      return {
        results: simplifyNotionPages(data.results),
        next_cursor: data.next_cursor,
        has_more: data.has_more,
      }
    },
  })
