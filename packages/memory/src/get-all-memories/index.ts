import { getAllMemoriesHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGetAllMemoriesTool(server: McpServer) {
  server.registerTool(
    'get-all-memories',
    {
      title: 'Get All Memories',
      description:
        'Retrieve all valid memories grouped by storage type (long-term, mid-term, short-term). Automatically cleans up expired entries and shows memory statistics.',
      inputSchema: {},
    },
    getAllMemoriesHandler,
  )
}
