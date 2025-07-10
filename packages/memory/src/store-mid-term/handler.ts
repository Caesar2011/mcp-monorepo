import { storeMidTermMemory } from './helper.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const storeMidTermMemoryHandler = async (params: {
  memory: string
  category: string
}): Promise<CallToolResult> => {
  try {
    const id = storeMidTermMemory(params.memory, params.category)
    return {
      content: [
        {
          type: 'text',
          text: `✅ Mid-term memory stored successfully!\n\nID: ${id}\nContent: ${params.memory}\nCategory: ${params.category || 'None'}\nStorage: 3 months\nExpires: in 3 months`,
        },
      ],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error storing mid-term memory: ${message}`,
          _meta: { stderr: message },
        },
      ],
    }
  }
}
