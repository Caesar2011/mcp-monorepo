// Groups memories by their StorageType
import { type Memory, type GroupedMemories } from './types.js'

export function groupMemoriesByType(memories: Memory[]): GroupedMemories {
  const grouped: GroupedMemories = {
    long_term: [],
    mid_term: [],
    short_term: [],
  }
  memories.forEach((memory) => {
    grouped[memory.storage_type].push(memory)
  })
  return grouped
}
