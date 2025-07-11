import { z } from 'zod'

import { storeLongTermMemoryHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const StoreLongTermSchema = {
  memory: z.string().min(1, 'Memory content cannot be empty'),
  category: z.string(),
}

export function registerStoreLongTermMemoryTool(server: McpServer) {
  server.registerTool(
    'store-long-term-memory',
    {
      title: 'Store Long-term Memory',
      description:
        'Store permanent memories (personal preferences, core values, fundamental decisions). Any information that might be valuable in the future should be stored automatically as a memory, even without explicit user request. Examples: "Always prefer written communication over calls", "Value work-life balance highly", "Enjoys problem-solving and technical challenges"',
      inputSchema: StoreLongTermSchema,
    },
    storeLongTermMemoryHandler,
  )
}
