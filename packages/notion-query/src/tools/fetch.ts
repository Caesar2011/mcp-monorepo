import { registerTool } from '@mcp-monorepo/shared'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  type GetDatabaseResponse,
  type GetDataSourceResponse,
  type GetPageResponse,
  type ListBlockChildrenResponse,
} from '@notionhq/client'
import {
  type BlockObjectResponse,
  type DatabaseObjectResponse,
  type DataSourceObjectResponse,
  type PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js'
import { z } from 'zod'

import { getNotionClient } from '../lib/client.js'
import { normalizeId } from '../lib/id-utils.js'
import { formatDatabaseToMarkdown, formatPageToMarkdown } from '../lib/response-formatter.js'

import type { NotionSyncer } from '../lib/notion-syncer.js'

type FetchedData =
  | { type: 'page'; page: GetPageResponse; blocks: ListBlockChildrenResponse }
  | { type: 'database'; database: GetDatabaseResponse; data_sources: GetDataSourceResponse[] }

export const registerFetchTool = (server: McpServer, notionSyncer: NotionSyncer) =>
  registerTool(server, {
    name: 'fetch',
    title: 'Fetch Notion entities',
    description: `Retrieves details about a Notion entity by its URL or ID.
You can fetch the following types of entities:
- Page, i.e. from a <page> block or a <mention-page> mention
- Database, i.e. from a <database> block or a <mention-database> mention
Use the "fetch" tool when you need to see the details of a Notion entity you already know
exists and have its URL or ID.
Provide the Notion entity's URL or ID in the \`id\` parameter. You must make multiple calls
to the "fetch" tool if you want to fetch multiple entities.
Content for pages that are returned use the enhanced Markdown format, which is a superset of
the standard Markdown syntax. See the full spec in the description of the "create-pages"
tool.
Databases can have multiple data sources, which are collections of pages with the same schema.
When fetching a database, the tool will return information about all its data sources.
Examples of fetching entities:
1. Fetch a page by URL:
{
"id": "https://www.notion.so/workspace/Product-Requirements-1234567890abcdef"
}
2. Fetch a page by ID (UUIDv4 with dashes):
{
"id": "12345678-90ab-cdef-1234-567890abcdef"
}
3. Fetch a page by ID (UUIDv4 without dashes):
{
"id": "1234567890abcdef1234567890abcdef"
}
4. Fetch a database:
{
"id": "https://www.notion.so/workspace/Projects-Database-abcdef1234567890"
}
Common use cases:
- "What are the product requirements still need to be implemented from this ticket
https://notion.so/page-url?"
- "Show me the details of the project database at this URL"
- "Get the content of page 12345678-90ab-cdef-1234-567890abcdef"`,
    isReadOnly: true,
    inputSchema: {
      id: z.string().describe('The ID or URL of the Notion page or database to fetch.'),
    },
    outputSchema: {
      markdown: z.string(),
    },
    async fetcher(args): Promise<FetchedData> {
      const notion = getNotionClient()
      const entityId = normalizeId(args.id)
      if (!entityId) {
        throw new Error(`Invalid Notion ID or URL: ${args.id}`)
      }

      try {
        const page = await notion.pages.retrieve({ page_id: entityId })
        const blocks = await notion.blocks.children.list({ block_id: entityId })
        return { type: 'page', page, blocks }
      } catch (pageError) {
        try {
          const databaseResponse = (await notion.databases.retrieve({
            database_id: entityId,
          })) as DatabaseObjectResponse

          // A database contains references to its data sources. We need to fetch each one to get the schema.
          const dataSourcePromises = (databaseResponse.data_sources || []).map((ds) =>
            notion.dataSources.retrieve({ data_source_id: ds.id }),
          )
          const data_sources = await Promise.all(dataSourcePromises)

          return { type: 'database', database: databaseResponse, data_sources }
        } catch (dbError) {
          throw new Error(`Could not fetch '${entityId}' as a page or database.`)
        }
      }
    },
    async formatter(data) {
      if (data.type === 'page') {
        await notionSyncer.triggerImmediateSync(data.page.id)
        return {
          markdown: await formatPageToMarkdown(
            data.page as PageObjectResponse,
            data.blocks.results as BlockObjectResponse[],
          ),
        }
      }
      // Pass both the database and its full data_sources to the formatter.
      return {
        markdown: await formatDatabaseToMarkdown(
          data.database as DatabaseObjectResponse,
          data.data_sources as DataSourceObjectResponse[],
        ),
      }
    },
  })
