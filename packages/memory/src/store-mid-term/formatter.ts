// Formatter for mid-term memory storage (delegates to lib)
import { formatStoreMemoryResult } from '../lib/formatStoreMemoryResult.js'

export function formatStoreMidTermResult(memoryId: number, memory: string, category: string): string {
  return formatStoreMemoryResult('mid_term', memoryId, memory, category)
}
