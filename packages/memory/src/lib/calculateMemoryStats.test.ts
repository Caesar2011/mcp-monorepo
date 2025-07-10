import { describe, it, expect } from 'vitest'

import { calculateMemoryStats } from './calculateMemoryStats.js'

import type { Memory } from './types.js'

describe('calculateMemoryStats', () => {
  it('returns all zeros when no memories', () => {
    const stats = calculateMemoryStats([])
    expect(stats).toEqual({ long_term: 0, mid_term: 0, short_term: 0, total: 0 })
  })
  it('counts correct types', () => {
    const shortMem = { id: 1, storage_type: 'short_term' } as Memory
    const midMem = { id: 2, storage_type: 'mid_term' } as Memory
    const longMem = { id: 3, storage_type: 'long_term' } as Memory
    const stats = calculateMemoryStats([shortMem, midMem, longMem])
    expect(stats).toEqual({ long_term: 1, mid_term: 1, short_term: 1, total: 3 })
  })
})
