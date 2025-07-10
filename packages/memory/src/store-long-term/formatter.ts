// Formatter for long-term memory storage (delegates to lib)
import { formatStoreMemoryResult } from '../lib/formatStoreMemoryResult.js'

export function formatStoreLongTermResult(memoryId: number, memory: string, category: string): string {
  return formatStoreMemoryResult('long_term', memoryId, memory, category)
}
