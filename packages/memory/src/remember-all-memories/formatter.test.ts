import { describe, expect, it } from 'vitest'

import { formatAllMemories } from './formatter.js'

import type { Memory } from '../lib/types.js'

describe('formatAllMemories', () => {
  const baseMem: Partial<Memory> = {
    category: 'Test',
    created_timestamp: new Date('2024-06-01').valueOf(),
    invalid_after: undefined,
  }
  const memories: Memory[] = [
    { ...baseMem, id: 1, content: 'Long term', storage_type: 'long_term' } as Memory,
    { ...baseMem, id: 2, content: 'Mid term', storage_type: 'mid_term' } as Memory,
    { ...baseMem, id: 3, content: 'Short term', storage_type: 'short_term' } as Memory,
  ]

  it('groups by type and formats correctly', () => {
    const out = formatAllMemories(memories)
    expect(out).toContain('🏛️ LONG-TERM MEMORIES')
    expect(out).toContain('📅 MID-TERM MEMORIES')
    expect(out).toContain('⏰ SHORT-TERM MEMORIES')
    expect(out).toContain('[ID: 1]: Long term [Test][stored: 2024-06-01][expires: Never]')
    expect(out).toContain('[ID: 2]: Mid term [Test][stored: 2024-06-01][expires: Never]')
    expect(out).toContain('[ID: 3]: Short term [Test][stored: 2024-06-01][expires: Never]')
    expect(out).toContain('Total memories: 3')
  })

  it('returns no memories stored for empty', () => {
    expect(formatAllMemories([])).toBe('No memories stored.')
  })
})
