import { z } from 'zod'

import { storeShortTermMemoryHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const StoreShortTermSchema = {
  memory: z.string().min(1, 'Memory content cannot be empty'),
  category: z.string(),
}

export function registerStoreShortTermMemoryTool(server: McpServer) {
  server.registerTool(
    'store-short-term-memory',
    {
      title: 'Store Short-term Memory',
      description:
        'Store memories for the next 7 days (moods, immediate decisions, temporary preferences). Any information that might be valuable in the future should be stored automatically as a memory, even without explicit user request. Examples: "Feeling stressed about project deadline", "Prefer morning meetings this week", "Avoiding caffeine today"',
      inputSchema: StoreShortTermSchema,
    },
    storeShortTermMemoryHandler,
  )
}
