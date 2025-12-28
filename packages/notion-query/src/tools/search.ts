import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { type QueryResult } from '../local-rag/types.js'

import type { NotionSyncer } from '../lib/notion-syncer.js'
import type { LocalRAG } from '../local-rag/index.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

/**
 * Defines the final structure of a search result returned by the tool.
 */
type NotionSearchResult = {
  title: string
  url: string
  highlight: string
  score: number
}

/**
 * Registers the Notion search tool with the MCP server.
 * The tool uses a LocalRAG instance for searching and a NotionSyncer for metadata.
 * @param server - The McpServer instance.
 * @param localRag - The initialized LocalRAG instance.
 * @param notionSyncer - The initialized NotionSyncer instance.
 */
export const registerSearchTool = (server: McpServer, localRag: LocalRAG, notionSyncer: NotionSyncer) => {
  return registerTool(server, {
    name: 'search',
    title: 'Search Notion workspace',
    description:
      'Perform a semantic search over your entire Notion workspace.\nYou can use search when you need to find information which is not already available via other tools, and you don\'t know where it\'s located.\nIf initial results do not contain all the information you need, you can try more specific queries.\nAfter obtaining search results, if the user asks for the full contents of a page or database, use the "fetch" tool. This tool only shows some details like a highlight and the URL and title of each search result.',
    inputSchema: {
      query: z
        .string()
        .min(1)
        .describe(
          "Semantic search query over your entire Notion workspace. For best results, don't provide more than one question per tool call.",
        ),
      page_url: z
        .string()
        .optional()
        .describe(
          'Optionally, provide the URL or ID of a page to search within. This will perform a semantic search over the content within and under the specified page.',
        ),
      teamspace_id: z
        .string()
        .optional()
        .describe(
          'Optionally, provide the ID of a teamspace to restrict search results to. This will perform a search over content within the specified teamspace only.',
        ),
      data_source_url: z
        .string()
        .optional()
        .describe(
          'Optionally, provide the URL of a Data source to search. This will perform a semantic search over the pages in the Data Source.',
        ),
    },
    outputSchema: {
      results: z
        .array(
          z.object({
            title: z.string(),
            url: z.string().url(),
            highlight: z.string(),
            score: z.number(),
          }),
        )
        .describe('An array of search results, ordered by relevance (lower score is better).'),
    },
    isReadOnly: true,
    async fetcher(args): Promise<QueryResult[]> {
      // The core logic is just to query the LocalRAG instance.
      // We don't need the syncer state here, we'll use it in the formatter.
      return localRag.query({
        query: args.query,
        limit: 5, // Return top 5 results
      })
    },
    async formatter(ragResults: QueryResult[]): Promise<{ results: NotionSearchResult[] }> {
      const syncState = notionSyncer.getSyncState()
      if (!syncState) {
        return { results: [] }
      }

      const searchResults: NotionSearchResult[] = []
      for (const result of ragResults) {
        // Extract the page ID from the file path (e.g., '.../content/page-id.md')
        const pageId = result.filePath.split(/[/\\]/).pop()?.replace('.md', '')

        if (pageId && syncState.pages[pageId]) {
          const pageInfo = syncState.pages[pageId]
          searchResults.push({
            title: pageInfo.title ?? '<N/A>',
            url: pageInfo.url ?? '<N/A>',
            highlight: result.text,
            score: result.score,
          })
        }
      }
      return { results: searchResults }
    },
  })
}
