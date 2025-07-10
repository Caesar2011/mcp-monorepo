import { describe, expect, it } from 'vitest'

import { formatSearchResults } from './formatter.js'

import type { Memory } from '../lib/types.js'

describe('formatSearchResults', () => {
  const baseMem: Partial<Memory> = {
    category: 'Cat',
    created_timestamp: new Date('2024-06-01').valueOf(),
    invalid_after: undefined,
  }
  const memories: Memory[] = [
    { ...baseMem, id: 1, content: 'Long match', storage_type: 'long_term' } as Memory,
    { ...baseMem, id: 2, content: 'Mid match', storage_type: 'mid_term' } as Memory,
  ]

  it('groups search results by type, formats, and shows keyword', () => {
    const out = formatSearchResults(memories, 'match')
    expect(out).toContain('🔎 Memories matching "match":')
    expect(out).toContain('🏛️ LONG-TERM MEMORIES')
    expect(out).toContain('📅 MID-TERM MEMORIES')
    expect(out).toContain('[ID: 1]: Long match [Cat][stored: 2024-06-01][expires: Never]')
    expect(out).toContain('[ID: 2]: Mid match [Cat][stored: 2024-06-01][expires: Never]')
    expect(out).not.toContain('⏰ SHORT-TERM MEMORIES') // group omitted if empty
  })

  it('returns no match message for empty', () => {
    expect(formatSearchResults([], 'foo')).toContain('No memories found matching "foo".')
  })
})
