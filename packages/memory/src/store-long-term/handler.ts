import { storeLongTermMemory } from './helper.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const storeLongTermMemoryHandler = async (params: {
  memory: string
  category: string
}): Promise<CallToolResult> => {
  try {
    const id = storeLongTermMemory(params.memory, params.category)
    return {
      content: [
        {
          type: 'text',
          text: `✅ Long-term memory stored successfully!\n\nID: ${id}\nContent: ${params.memory}\nCategory: ${params.category || 'None'}\nStorage: Permanent\nExpires: Never`,
        },
      ],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error storing long-term memory: ${message}`,
          _meta: { stderr: message },
        },
      ],
    }
  }
}
