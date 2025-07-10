// New formatting for memory objects and all memories list
import { formatExpiryDate } from './formatExpiryDate.js'
import { type Memory } from './types.js'

export function formatMemory(memory: Memory): string {
  const createdDate = new Date(memory.created_timestamp).toISOString().split('T')[0]
  const category = memory.category && memory.category.trim() ? memory.category : 'None'
  const expiryInfo = memory.invalid_after ? formatExpiryDate(memory.invalid_after) : 'Never'
  return `[ID: ${memory.id}]: ${memory.content} [${category}][stored: ${createdDate}][expires: ${expiryInfo}]`
}
