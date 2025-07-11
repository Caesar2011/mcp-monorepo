import { findMemoryById, deleteMemoryById } from './helper.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

const createErrorResponse = (message: string, stderr?: string): CallToolResult => ({
  content: [
    {
      type: 'text',
      text: `❌ ${message}`,
      ...(stderr && { _meta: { stderr } }),
    },
  ],
})

const createSuccessResponse = (message: string): CallToolResult => ({
  content: [
    {
      type: 'text',
      text: `✅ ${message}`,
    },
  ],
})

const createNotFoundResponse = (id: number): CallToolResult => createErrorResponse(`No memory found with ID ${id}`)

export const removeMemoryHandler = async (params: { id: number }): Promise<CallToolResult> => {
  try {
    const found = findMemoryById(params.id)
    if (!found) {
      return createNotFoundResponse(params.id)
    }

    const deleted = deleteMemoryById(params.id)
    if (!deleted) {
      return createErrorResponse(`Failed to delete memory with ID ${params.id}`)
    }

    return createSuccessResponse(`Successfully removed memory with ID ${params.id}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return createErrorResponse(`Error removing memory: ${message}`, message)
  }
}
