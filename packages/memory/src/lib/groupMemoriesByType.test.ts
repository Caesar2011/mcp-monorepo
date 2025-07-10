import { describe, it, expect } from 'vitest'

import { groupMemoriesByType } from './groupMemoriesByType.js'

import type { Memory } from './types.js'

describe('groupMemoriesByType', () => {
  it('returns all empty arrays for no input', () => {
    expect(groupMemoriesByType([])).toEqual({
      long_term: [],
      mid_term: [],
      short_term: [],
    })
  })
  it('places each memory in its correct bucket', () => {
    const shortMem = { id: 1, storage_type: 'short_term' } as Memory
    const midMem = { id: 2, storage_type: 'mid_term' } as Memory
    const longMem = { id: 3, storage_type: 'long_term' } as Memory
    const result = groupMemoriesByType([shortMem, midMem, longMem])
    expect(result.short_term).toEqual([shortMem])
    expect(result.mid_term).toEqual([midMem])
    expect(result.long_term).toEqual([longMem])
  })
})
