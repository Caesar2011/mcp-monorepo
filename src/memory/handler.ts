import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import {
  StorageType,
  StoreMemoryArgs,
  RemoveMemoryArgs,
  SearchMemoryArgs,
  cleanupExpiredMemories,
  storeMemory,
  findMemoryById,
  deleteMemoryById,
  searchMemoriesByKeyword,
  getAllMemories,
  groupMemoriesByType,
  calculateMemoryStats,
  formatMemory,
  getStorageDuration,
  formatExpiryDate,
  getStorageTypeEmoji,
  getStorageTypeDisplayName,
} from './helpers.js'

// Create success response
function createSuccessResponse(message: string): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
  }
}

// Create error response
function createErrorResponse(message: string, stderr: string): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: message,
        _meta: { stderr },
      },
    ],
  }
}

// Generic store memory handler
function createStoreMemoryHandler(storageType: StorageType) {
  return async (args: StoreMemoryArgs): Promise<CallToolResult> => {
    try {
      cleanupExpiredMemories()

      const { memory, category } = args
      const memoryId = storeMemory(memory, category || null, storageType)

      const duration = getStorageDuration(storageType)
      const expiryText =
        storageType === 'long_term'
          ? 'Never'
          : formatExpiryDate(
              storageType === 'short_term'
                ? Date.now() + 7 * 24 * 60 * 60 * 1000
                : Date.now() + 90 * 24 * 60 * 60 * 1000,
            )

      const output =
        `✅ ${storageType.replace('_', '-')} memory stored successfully!\n\n` +
        `ID: ${memoryId}\n` +
        `Content: ${memory}\n` +
        `Category: ${category || 'None'}\n` +
        `Storage: ${duration}\n` +
        `Expires: ${expiryText}`

      return createSuccessResponse(output)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Failed to store ${storageType} memory: ${errorMessage}`)

      return createErrorResponse(
        `❌ Error storing ${storageType.replace('_', '-')} memory: ${errorMessage}`,
        errorMessage,
      )
    }
  }
}

// Store memory handlers using the generic function
export const storeShortTermHandler = createStoreMemoryHandler('short_term')
export const storeMidTermHandler = createStoreMemoryHandler('mid_term')
export const storeLongTermHandler = createStoreMemoryHandler('long_term')

// Remove long-term memory handler
export const removeLongTermHandler = async (args: RemoveMemoryArgs): Promise<CallToolResult> => {
  try {
    cleanupExpiredMemories()

    const { id } = args

    // Check if memory exists and is long-term
    const memory = findMemoryById(id, 'long_term')
    if (!memory) {
      return createErrorResponse(`❌ Long-term memory with ID ${id} not found`, `Memory ID ${id} not found`)
    }

    // Delete the memory
    const deleted = deleteMemoryById(id, 'long_term')
    if (!deleted) {
      return createErrorResponse(`❌ Failed to remove memory with ID ${id}`, `Delete operation failed for ID ${id}`)
    }

    const output =
      `✅ Long-term memory removed successfully!\n\n` +
      `Removed ID: ${id}\n` +
      `Content: ${memory.content}\n` +
      `Category: ${memory.category || 'None'}`

    return createSuccessResponse(output)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to remove long-term memory: ${errorMessage}`)

    return createErrorResponse(`❌ Error removing long-term memory: ${errorMessage}`, errorMessage)
  }
}

// Search memories handler
export const searchMemoriesHandler = async (args: SearchMemoryArgs): Promise<CallToolResult> => {
  try {
    cleanupExpiredMemories()

    const { keyword } = args
    const memories = searchMemoriesByKeyword(keyword)

    if (memories.length === 0) {
      return createSuccessResponse(`🔍 No memories found matching keyword: "${keyword}"`)
    }

    const formattedMemories = memories.map(formatMemory)
    const output = `🔍 Found ${memories.length} memories matching "${keyword}":\n\n` + formattedMemories.join('\n\n')

    return createSuccessResponse(output)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to search memories: ${errorMessage}`)

    return createErrorResponse(`❌ Error searching memories: ${errorMessage}`, errorMessage)
  }
}

// Get all memories handler
export const getAllMemoriesHandler = async (): Promise<CallToolResult> => {
  try {
    cleanupExpiredMemories()

    const memories = getAllMemories()

    if (memories.length === 0) {
      return createSuccessResponse('📝 No memories stored yet')
    }

    const grouped = groupMemoriesByType(memories)
    const stats = calculateMemoryStats(memories)

    let output =
      `📝 All Memories (${stats.total} total)\n` +
      `Long-term: ${stats.long_term} | Mid-term: ${stats.mid_term} | Short-term: ${stats.short_term}\n\n`

    // Display memories by type
    const storageTypes: StorageType[] = ['long_term', 'mid_term', 'short_term']

    storageTypes.forEach((storageType) => {
      const memoriesOfType = grouped[storageType]
      if (memoriesOfType.length > 0) {
        const emoji = getStorageTypeEmoji(storageType)
        const displayName = getStorageTypeDisplayName(storageType)

        output += `${emoji} ${displayName}:\n`
        memoriesOfType.forEach((memory) => {
          output += `${formatMemory(memory)}\n`
        })
        output += '\n'
      }
    })

    return createSuccessResponse(output.trim())
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to retrieve memories: ${errorMessage}`)

    return createErrorResponse(`❌ Error retrieving memories: ${errorMessage}`, errorMessage)
  }
}
