import { describe, it, expect, beforeEach, vi } from 'vitest'

import { formatStoreMemoryResult } from './formatStoreMemoryResult.js'

import type { StorageType } from './types.js'

describe('formatStoreMemoryResult', () => {
  const fixedTimestamp = 1672531200000 // Example static timestamp (e.g., Jan 1, 2023, in milliseconds)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(fixedTimestamp) // Mock Date.now()
  })

  it.each<[{ storageType: StorageType; id: number; memory: string; category: string | null; expected: string }]>([
    [
      {
        storageType: 'short_term',
        id: 1,
        memory: 'foo',
        category: 'cat',
        expected:
          '✅ short-term memory stored successfully!\n\nID: 1\nContent: foo\nCategory: cat\nStorage: 7 days\nExpires: 2023-01-08',
      },
    ],
    [
      {
        storageType: 'mid_term',
        id: 2,
        memory: 'bar',
        category: '',
        expected:
          '✅ mid-term memory stored successfully!\n\nID: 2\nContent: bar\nCategory: None\nStorage: 3 months\nExpires: 2023-04-01',
      },
    ],
    [
      {
        storageType: 'long_term',
        id: 4,
        memory: 'baz',
        category: '',
        expected:
          '✅ long-term memory stored successfully!\n\nID: 4\nContent: baz\nCategory: None\nStorage: Permanent\nExpires: Never',
      },
    ],
  ])('formats memory for $storageType/$category', ({ storageType, id, memory, category, expected }) => {
    const result = formatStoreMemoryResult(storageType, id, memory, category)
    expect(result).toMatch(expected)
  })

  it('handles emojis and very long/odd categories', () => {
    const result = formatStoreMemoryResult('short_term', 10, 'w💡rd', '💗🐙🧪'.repeat(10))
    expect(result).toMatch(/Category: .+/)
  })

  it('shows correct expiration dates for mid/short', () => {
    const mid = formatStoreMemoryResult('mid_term', 3, 'x', 'category')
    expect(mid).toMatch(/Expires: \d{4}-\d{2}-\d{2}/)
    const short = formatStoreMemoryResult('short_term', 3, 'y', 'category')
    expect(short).toMatch(/Expires: \d{4}-\d{2}-\d{2}/)
  })

  it('always shows Expires: Never for long_term', () => {
    const long = formatStoreMemoryResult('long_term', 42, 'abc', 'cat')
    expect(long).toMatch(/Expires: Never/)
  })
})
