import { z } from 'zod'

import { removeMemoryHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const RemoveSchema = {
  id: z.number().int().positive(),
}

export function registerRemoveMemoryTool(server: McpServer) {
  server.registerTool(
    'remove-memory',
    {
      title: 'Remove Memory',
      description: 'Remove memory entry by its ID. Works for long, mid, and short-term memories.',
      inputSchema: RemoveSchema,
    },
    removeMemoryHandler,
  )
}
