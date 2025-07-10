import { z } from 'zod'

import { storeMidTermMemoryHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const StoreMidTermSchema = {
  memory: z.string().min(1, 'Memory content cannot be empty'),
  category: z.string(),
}

export function registerStoreMidTermMemoryTool(server: McpServer) {
  server.registerTool(
    'store-mid-term-memory',
    {
      title: 'Store Mid-term Memory',
      description:
        'Store memories for the next 3 months (plans, evolving preferences, project decisions). Examples: "Planning to learn TypeScript this quarter", "Team prefers async communication", "Working on improving code review process"',
      inputSchema: StoreMidTermSchema,
    },
    storeMidTermMemoryHandler,
  )
}
