import { describe, it, expect } from 'vitest'

import { formatMemory } from './formatMemory.js'

import type { Memory } from './types.js'

describe('formatMemory', () => {
  it('formats a typical memory', () => {
    const mem: Memory = {
      id: 1,
      content: 'Remember the milk',
      category: 'todo',
      storage_type: 'short_term',
      created_at: '1 day ago',
      created_timestamp: 1626825600000,
      invalid_after: 1627430400000,
    }
    const res = formatMemory(mem)
    expect(res).toMatch(/Remember the milk/)
    expect(res).toMatch(/\[todo]/)
    expect(res).toMatch(/\[stored: 2021-07-21]/)
  })
  it('shows invalid_after as Never if not present', () => {
    const mem = {
      id: 3,
      content: 'No cat',
      storage_type: 'mid_term',
      created_at: '1 day ago',
      created_timestamp: Date.now(),
      invalid_after: undefined,
      category: 'category',
    } as Memory
    expect(formatMemory(mem)).toMatch(/\[expires: Never]/)
  })
  it('handles empty string category', () => {
    const mem = {
      id: 4,
      content: 'X',
      storage_type: 'mid_term',
      created_timestamp: Date.now(),
      invalid_after: 1627430400000,
      category: '',
    } as Memory
    expect(formatMemory(mem)).toMatch(/[None]/)
  })
})
