import { formatAllMemories } from './formatter.js'
import { rememberAllMemories } from './helper.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const rememberAllMemoriesHandler = async (): Promise<CallToolResult> => {
  try {
    const memories = rememberAllMemories()
    return {
      content: [
        {
          type: 'text',
          text: formatAllMemories(memories),
        },
      ],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error retrieving all memories: ${message}`,
          _meta: { stderr: message },
        },
      ],
    }
  }
}
