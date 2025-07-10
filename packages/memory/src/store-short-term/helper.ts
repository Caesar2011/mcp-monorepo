// Helper for storing short-term memories (delegates to lib/storeMemory)
import { storeMemory } from '../lib/storeMemory.js'
import { type StorageType } from '../lib/types.js'

export function storeShortTermMemory(content: string, category: string): number {
  return storeMemory('short_term' as StorageType, content, category)
}
