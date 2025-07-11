import { rememberAllMemoriesHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerRememberAllMemoriesTool(server: McpServer) {
  server.registerTool(
    'remember-all-memories',
    {
      title: 'Remember All Memories',
      description:
        'Retrieve all valid memories related to the user grouped by storage type (long-term, mid-term, short-term). // IMPORTANT: Always call this tool to fetch all memories if memory context is not already present. Never skip this step. Never assume context.',
      inputSchema: {},
    },
    rememberAllMemoriesHandler,
  )
}
