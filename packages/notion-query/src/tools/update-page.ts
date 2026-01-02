import { registerTool } from '@mcp-monorepo/shared'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type BlockObjectRequest } from '@notionhq/client'
import {
  type BlockObjectResponse,
  type DataSourceObjectResponse,
  type PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js'
import { markdownToBlocks } from '@tryfabric/martian'
import { z } from 'zod'

import { getNotionClient } from '../lib/client.js'
import { normalizeId } from '../lib/id-utils.js'
import { notionToMarkdown } from '../lib/markdown-converter.js'
import { parsePropertiesForUpdate } from '../lib/property-parser.js'
import { type ToolServices } from '../lib/types.js'

const description = `Update a Notion page's properties or content.
Notion page properties are a JSON map of property names to SQLite values.
For pages in a database, use the SQLite schema definition shown in <database>.
For pages outside of a database, the only allowed property is "title", which is the title of the page in inline markdown format.
Notion page content is a string in Notion-flavored Markdown format. See the "create-pages" tool description for the full enhanced Markdown spec.
Before updating a page's content with this tool, use the "fetch" tool first to get the existing content to find out the Markdown snippets to use in the "replace_content_range" or "insert_content_after" commands.
IMPORTANT: Some property types require expanded formats:
- Date properties: Split into "date:{property}:start", "date:{property}:end" (optional), and "date:{property}:is_datetime" (0 or 1)
- Place properties: Split into "place:{property}:name", "place:{property}:address", "place:{property}:latitude", "place:{property}:longitude", and "place:{property}:google_place_id" (optional)
Number properties accept JavaScript numbers (not strings). Use null to remove a property's value. Boolean values like "__YES__" are supported for checkbox properties.`

/** Helper function to find and modify a text range based on a start...end snippet */
function findAndModifyText(
  fullText: string,
  snippet: string,
  newText: string,
  mode: 'replace' | 'insert_after',
): string {
  if (!snippet.includes('...')) {
    throw new Error('Invalid selection_with_ellipsis format. Must contain exactly one "...".')
  }
  const [start, end] = snippet.split('...').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  const regex = new RegExp(`(${start})([\\s\\S]*?)(${end})`, 's')
  const match = fullText.match(regex)
  if (!match) throw new Error(`Could not find the specified content range: "${snippet}"`)

  const originalMatch = match[0]
  if (mode === 'replace') return fullText.replace(originalMatch, newText)
  return fullText.replace(originalMatch, originalMatch + newText)
}

export const registerUpdatePageTool = (server: McpServer, services: ToolServices) =>
  registerTool(server, {
    name: 'notion-update-page',
    title: 'Update Notion page',
    description,
    inputSchema: {
      data: z.discriminatedUnion('command', [
        z
          .object({
            page_id: z.string().describe('The ID of the page to update, with or without dashes.'),
            command: z.literal('update_properties'),
            properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
          })
          .strict(),
        z
          .object({
            page_id: z.string().describe('The ID of the page to update, with or without dashes.'),
            command: z.literal('replace_content'),
            new_str: z.string().describe('The new string to replace all content with.'),
          })
          .strict(),
        z
          .object({
            page_id: z.string().describe('The ID of the page to update, with or without dashes.'),
            command: z.literal('replace_content_range'),
            selection_with_ellipsis: z.string().describe('Unique start and end snippet of the string to replace...'),
            new_str: z.string().describe('The new string to replace the old string with.'),
          })
          .strict(),
        z
          .object({
            page_id: z.string().describe('The ID of the page to update, with or without dashes.'),
            command: z.literal('insert_content_after'),
            selection_with_ellipsis: z.string().describe('Unique start and end snippet of the string to match...'),
            new_str: z.string().describe('The new content to insert.'),
          })
          .strict(),
      ]),
    },
    outputSchema: {
      page_id: z.string(),
      url: z.string(),
      last_edited_time: z.string(),
    },
    async fetcher(args): Promise<PageObjectResponse> {
      const notion = getNotionClient()
      const { data } = args
      const pageId = normalizeId(data.page_id)
      if (!pageId) throw new Error(`Invalid page_id: ${data.page_id}`)

      switch (data.command) {
        case 'update_properties': {
          const page = (await notion.pages.retrieve({ page_id: pageId })) as PageObjectResponse
          if (page.parent.type !== 'data_source_id') {
            throw new Error('Cannot update properties on a page that is not in a database.')
          }
          const dataSource = (await notion.dataSources.retrieve({
            data_source_id: page.parent.data_source_id,
          })) as DataSourceObjectResponse

          const notionProperties = parsePropertiesForUpdate(data.properties, dataSource.properties)
          return (await notion.pages.update({ page_id: pageId, properties: notionProperties })) as PageObjectResponse
        }

        case 'replace_content':
        case 'replace_content_range':
        case 'insert_content_after': {
          const allBlocks = (await notion.blocks.children.list({ block_id: pageId })).results as BlockObjectResponse[]

          let newMarkdown: string
          if (data.command === 'replace_content') {
            newMarkdown = data.new_str
          } else {
            const originalMd = await notionToMarkdown(allBlocks)
            const mode = data.command === 'replace_content_range' ? 'replace' : 'insert_after'
            newMarkdown = findAndModifyText(originalMd, data.selection_with_ellipsis, data.new_str, mode)
          }

          // Delete all existing blocks before adding new ones.
          // This is inefficient but necessary for replacement commands.
          const deletePromises = allBlocks.map((block) => notion.blocks.delete({ block_id: block.id }))
          await Promise.all(deletePromises)

          const newBlocks = markdownToBlocks(newMarkdown) as BlockObjectRequest[]
          const chunks = []
          for (let i = 0; i < newBlocks.length; i += 100) {
            chunks.push(newBlocks.slice(i, i + 100))
          }
          for (const chunk of chunks) {
            await notion.blocks.children.append({ block_id: pageId, children: chunk })
          }

          return (await notion.pages.retrieve({ page_id: pageId })) as PageObjectResponse
        }
        default:
          // This case should be unreachable due to Zod validation
          throw new Error('Invalid command for update-page tool.')
      }
    },

    async formatter(updatedPage) {
      await services.notionSyncer?.triggerImmediateSync(updatedPage.id)
      return {
        page_id: updatedPage.id,
        url: updatedPage.url,
        last_edited_time: updatedPage.last_edited_time,
      }
    },
  })
