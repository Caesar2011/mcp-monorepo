// Helper for storing mid-term memories (delegates to lib/storeMemory)
import { storeMemory } from '../lib/storeMemory.js'
import { type StorageType } from '../lib/types.js'

export function storeMidTermMemory(content: string, category: string): number {
  return storeMemory('mid_term' as StorageType, content, category)
}
