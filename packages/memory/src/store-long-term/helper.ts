// Helper for storing long-term memories (delegates to lib/storeMemory)
import { storeMemory } from '../lib/storeMemory.js'
import { type StorageType } from '../lib/types.js'

export function storeLongTermMemory(content: string, category: string): number {
  return storeMemory('long_term' as StorageType, content, category)
}
