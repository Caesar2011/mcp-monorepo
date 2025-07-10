// Computes counts of memories for each storage type and total
import { groupMemoriesByType } from './groupMemoriesByType.js'
import { type Memory, type MemoryStats } from './types.js'

export function calculateMemoryStats(memories: Memory[]): MemoryStats {
  const grouped = groupMemoriesByType(memories)
  return {
    long_term: grouped.long_term.length,
    mid_term: grouped.mid_term.length,
    short_term: grouped.short_term.length,
    total: memories.length,
  }
}
