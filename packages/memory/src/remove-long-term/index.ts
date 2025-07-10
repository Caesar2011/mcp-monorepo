import { z } from 'zod'

import { removeLongTermMemoryHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const RemoveLongTermSchema = {
  id: z.number().int().positive(),
}

export function registerRemoveLongTermMemoryTool(server: McpServer) {
  server.registerTool(
    'remove-long-term-memory',
    {
      title: 'Remove Long-term Memory',
      description:
        'Remove a long-term memory entry by its ID. Only long-term memories can be removed this way since short and mid-term memories expire automatically.',
      inputSchema: RemoveLongTermSchema,
    },
    removeLongTermMemoryHandler,
  )
}
