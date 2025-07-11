import { formatMemory } from '../lib/formatMemory.js'
import { groupMemoriesByType } from '../lib/groupMemoriesByType.js'
import { storageTypeProperties } from '../lib/storageTypeProperties.js'
import { type Memory } from '../lib/types.js'

export function formatSearchResults(memories: Memory[], keyword: string): string {
  if (!memories.length) return `No memories found matching "${keyword}".`
  const grouped = groupMemoriesByType(memories)
  const result: string[] = [
    `🔎 Memories matching "${keyword}":`,
    ...(['long_term', 'mid_term', 'short_term'] as const)
      .filter((type) => grouped[type].length)
      .flatMap((type) => [
        `\n${storageTypeProperties[type].emoji} ${storageTypeProperties[type].displayName}: (${grouped[type].length})`,
        ...grouped[type].map(formatMemory),
      ]),
  ]
  return result.join('\n')
}
