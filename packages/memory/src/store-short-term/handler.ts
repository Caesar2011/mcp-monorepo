import { storeShortTermMemory } from './helper.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const storeShortTermMemoryHandler = async (params: {
  memory: string
  category: string
}): Promise<CallToolResult> => {
  try {
    const id = storeShortTermMemory(params.memory, params.category)
    return {
      content: [
        {
          type: 'text',
          text: `✅ Short-term memory stored successfully!\n\nID: ${id}\nContent: ${params.memory}\nCategory: ${params.category || 'None'}\nStorage: 7 days\nExpires: in 7 days`,
        },
      ],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error storing short-term memory: ${message}`,
          _meta: { stderr: message },
        },
      ],
    }
  }
}
