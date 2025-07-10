import { findLongTermMemoryById, deleteLongTermMemoryById } from './helper.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const removeLongTermMemoryHandler = async (params: { id: number }): Promise<CallToolResult> => {
  try {
    const found = findLongTermMemoryById(params.id)
    if (!found) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ No long-term memory found with ID ${params.id}`,
          },
        ],
      }
    }
    const deleted = deleteLongTermMemoryById(params.id)
    if (!deleted) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to delete long-term memory with ID ${params.id}`,
          },
        ],
      }
    }
    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully removed long-term memory with ID ${params.id}`,
        },
      ],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error removing long-term memory: ${message}`,
          _meta: { stderr: message },
        },
      ],
    }
  }
}
