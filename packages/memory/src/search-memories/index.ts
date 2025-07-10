import { z } from 'zod'

import { searchMemoriesHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const SearchMemoriesSchema = {
  keyword: z.string().min(1),
}

export function registerSearchMemoriesTool(server: McpServer) {
  server.registerTool(
    'search-memories',
    {
      title: 'Search Memories',
      description:
        'Search all valid memories by a single keyword. Searches both content and category fields. Automatically cleans up expired memories before searching.',
      inputSchema: SearchMemoriesSchema,
    },
    searchMemoriesHandler,
  )
}
