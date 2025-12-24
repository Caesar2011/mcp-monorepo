import { registerTool } from '@mcp-monorepo/shared'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type BlockObjectRequest, type CreatePageParameters } from '@notionhq/client'
import {
  type DatabaseObjectResponse,
  type DataSourceObjectResponse,
  type PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js'
import { markdownToBlocks } from '@tryfabric/martian'
import { z } from 'zod'

import { getNotionClient } from '../lib/client.js'
import { normalizeId } from '../lib/id-utils.js'
import { parsePropertiesForCreate } from '../lib/property-parser.js'

// The description is an exact copy of the provided tool definition [1].
const description = `Creates one or more Notion pages with specified properties and content.
Use "create-pages" when you need to create one or more new pages that don't exist yet.
Always include a title property under \`properties\` in each entry of the \`pages\` array.
Otherwise, the page title will appear blank even if the page content is populated. Don't
duplicate the page title at the top of the page's \`content\`.
When creating pages under a Notion database, the property names must match the database's
schema. Use the "fetch" tool with a Notion database URL to get the database schema. Or, look
for existing pages under the database using the "search" tool then use the "fetch" tool to see
the names of the property keys. One exception is the "title" property, which all pages have,
but can be named differently in the schema of a database. For convenience, you can use the
generic property name "title" in the "properties" object, and it will automatically be
re-mapped to the actual name of the title property in the database schema when creating the
page.
All pages created with a single call to this tool will have the same parent.
The parent can be a Notion page or database. If the parent is omitted, the pages will be
created as standalone, workspace-level private pages and the person that created them
can organize them as they see fit later.
IMPORTANT: When specifying a parent database, use the appropriate ID format:
- Use "data_source_id" when you have a collection:// URL from the fetch tool (this is the most common case)
- Use "database_id" when you have a page URL for a database view (less common)
- Use "page_id" when the parent is a regular page
Examples of creating pages:
1. Create a standalone page with a title and content:
{
"pages": [
{
"properties": {"title":"Page title"},
"content": "# Section 1\\nSection 1 content\\n# Section 2\\nSection 2 content"
}
]
}
2. Create a page under a database's data source (collection), e.g. using an ID from a collection:// URL provided by the fetch tool:
{
"parent": {"data_source_id": "f336d0bc-b841-465b-8045-024475c079dd"},
"pages": [
{
"properties": {
"Task Name": "Task 123",
"Status": "In Progress",
},
},
],
}
3. Create a page with an existing page as a parent:
{
"parent": {"page_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"},
"pages": [
{
"properties": {"title": "Page title"},
"content": "# Section 1\\nSection 1 content\\n# Section 2\\nSection 2 content"
}
]
}`

export const registerCreatePagesTool = (server: McpServer) =>
  registerTool(server, {
    name: 'notion-create-pages',
    title: 'Create pages in Markdown',
    description,
    inputSchema: {
      pages: z
        .array(
          z
            .object({
              content: z.string().describe('The content of the new page, using Notion Markdown.').optional(),
              properties: z
                .record(z.union([z.string(), z.number(), z.null()]))
                .describe(
                  'The properties of the new page, which is a JSON map of property names to SQLite values.\nFor pages in a database, use the SQLite schema definition shown in <database>.\nFor pages outside of a database, the only allowed property is "title", which is the title of the page and is automatically shown at the top of the page as a large heading.',
                ),
            })
            .strict(),
        )
        .max(100)
        .describe('The pages to create.'),
      parent: z
        .union([
          z
            .object({
              type: z.literal('page_id').optional(),
              page_id: z
                .string()
                .describe(
                  'The ID of the parent page (with or without dashes), for example, 195de9221179449fab8075a27c979105',
                ),
            })
            .strict(),
          z
            .object({
              type: z.literal('database_id').optional(),
              database_id: z
                .string()
                .describe(
                  'The ID of the parent database (with or without dashes), for example, 195de9221179449fab8075a27c979105',
                ),
            })
            .strict(),
          z
            .object({
              type: z.literal('data_source_id').optional(),
              data_source_id: z
                .string()
                .describe(
                  'The ID of the parent data source (collection), with or without dashes. For example, f336d0bc-b841-465b-8045-024475c079dd',
                ),
            })
            .strict(),
        ])
        .optional()
        .describe(
          'The parent under which the new pages will be created. This can be a page (page_id), a database page (database_id), or a data source/collection under a database (data_source_id). If omitted, the new pages will be created as private pages at the workspace level. Use data_source_id when you have a collection:// URL from the fetch tool.',
        ),
    },
    outputSchema: {
      created_pages: z
        .array(
          z.object({
            page_id: z.string(),
            url: z.string(),
            title: z.string().optional(),
          }),
        )
        .describe('A list of the pages that were successfully created.'),
    },
    async fetcher(args): Promise<PageObjectResponse[]> {
      const notion = getNotionClient()
      const { pages, parent } = args

      let apiParent: CreatePageParameters['parent']
      let dataSourceSchema: DataSourceObjectResponse['properties'] | undefined

      if (!parent) {
        // To create a page at the workspace level, the parent must be `{ workspace: true }` [2, 1].
        apiParent = { workspace: true }
      } else if ('data_source_id' in parent && parent.data_source_id) {
        const id = normalizeId(parent.data_source_id)
        if (!id) throw new Error(`Invalid data_source_id: ${parent.data_source_id}`)
        const dataSource = (await notion.dataSources.retrieve({ data_source_id: id })) as DataSourceObjectResponse
        apiParent = { database_id: dataSource.parent.database_id }
        dataSourceSchema = dataSource.properties
      } else if ('database_id' in parent && parent.database_id) {
        const id = normalizeId(parent.database_id)
        if (!id) throw new Error(`Invalid database_id: ${parent.database_id}`)
        const database = (await notion.databases.retrieve({ database_id: id })) as DatabaseObjectResponse
        const firstDataSourceId = database.data_sources[0]?.id
        if (!firstDataSourceId) throw new Error(`Database ${parent.database_id} has no data sources.`)
        const dataSource = (await notion.dataSources.retrieve({
          data_source_id: firstDataSourceId,
        })) as DataSourceObjectResponse
        apiParent = { database_id: dataSource.parent.database_id }
        dataSourceSchema = dataSource.properties
      } else if ('page_id' in parent && parent.page_id) {
        const id = normalizeId(parent.page_id)
        if (!id) throw new Error(`Invalid page_id: ${parent.page_id}`)
        apiParent = { page_id: id }
      } else {
        throw new Error('Invalid parent object provided.')
      }

      const createPagePromises = pages.map(async (page) => {
        const children = page.content ? (markdownToBlocks(page.content) as BlockObjectRequest[]) : undefined
        const notionProperties = parsePropertiesForCreate(page.properties, dataSourceSchema)

        const newPage = await notion.pages.create({
          parent: apiParent,
          properties: notionProperties,
          children,
        })
        return newPage as PageObjectResponse
      })

      return Promise.all(createPagePromises)
    },

    async formatter(createdPages) {
      const results = createdPages.map((page) => {
        const titleProperty = Object.values(page.properties).find((p) => p.type === 'title')
        const title =
          titleProperty && 'title' in titleProperty && titleProperty.title.length > 0
            ? titleProperty.title[0].plain_text
            : 'Untitled'

        return {
          page_id: page.id,
          url: page.url,
          title,
        }
      })
      return { created_pages: results }
    },
  })
