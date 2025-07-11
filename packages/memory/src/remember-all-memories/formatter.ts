import { formatMemory } from '../lib/formatMemory.js'
import { groupMemoriesByType } from '../lib/groupMemoriesByType.js'
import { storageTypeProperties } from '../lib/storageTypeProperties.js'
import { type Memory } from '../lib/types.js'

export function formatAllMemories(memories: Memory[]): string {
  const total = memories.length
  if (!total) return 'No memories stored.'
  const grouped = groupMemoriesByType(memories)

  const result: string[] = [
    `Total memories: ${total}`,
    ...(['long_term', 'mid_term', 'short_term'] as const)
      .filter((type) => grouped[type].length)
      .flatMap((type) => [
        `\n${storageTypeProperties[type].emoji} ${storageTypeProperties[type].displayName}: (${grouped[type].length})`,
        ...grouped[type].map(formatMemory),
      ]),
  ]
  return result.join('\n')
}
