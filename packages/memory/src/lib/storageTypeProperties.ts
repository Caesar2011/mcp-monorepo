// Centralized properties for each memory storage type
import type { StorageType } from './types.js'

export const storageTypeProperties: Record<
  StorageType,
  {
    displayName: string
    emoji: string
    duration: string
  }
> = {
  long_term: {
    displayName: 'LONG-TERM MEMORIES (Permanent)',
    emoji: '🏛️',
    duration: 'Permanent',
  },
  mid_term: {
    displayName: 'MID-TERM MEMORIES (3 months)',
    emoji: '📅',
    duration: '3 months',
  },
  short_term: {
    displayName: 'SHORT-TERM MEMORIES (7 days)',
    emoji: '⏰',
    duration: '7 days',
  },
}
