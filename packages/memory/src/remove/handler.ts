import { findMemoryById, deleteMemoryById } from './helper.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const removeMemoryHandler = async (params: { id: number }): Promise<CallToolResult> => {
  try {
    const found = findMemoryById(params.id)
    if (!found) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ No memory found with ID ${params.id}`,
          },
        ],
      }
    }
    const deleted = deleteMemoryById(params.id)
    if (!deleted) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to delete memory with ID ${params.id}`,
          },
        ],
      }
    }
    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully removed memory with ID ${params.id}`,
        },
      ],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error removing memory: ${message}`,
          _meta: { stderr: message },
        },
      ],
    }
  }
}
