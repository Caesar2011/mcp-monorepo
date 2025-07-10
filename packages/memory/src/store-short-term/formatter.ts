// Formatter for short-term memory storage (delegates to lib)
import { formatStoreMemoryResult } from '../lib/formatStoreMemoryResult.js'

export function formatStoreShortTermResult(memoryId: number, memory: string, category: string): string {
  return formatStoreMemoryResult('short_term', memoryId, memory, category)
}
