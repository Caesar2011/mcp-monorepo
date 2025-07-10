import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest'

// @ts-expect-error This is defined by mock
import { getMockFn } from './getDatabase.js'
import { getExpiryTimestamp } from './getExpiryTimestamp'
import { storeMemory } from './storeMemory.js'

import type { StorageType } from './types.js'

export type RunMockedFnType = MockedFunction<() => { lastInsertRowid: number }>

// Mock getDatabase to return a custom DB handle
vi.mock('./getDatabase.js', () => {
  const runCallback: RunMockedFnType = vi.fn(() => ({ lastInsertRowid: 0 }))
  return {
    getDatabase: () => ({
      prepare: () => ({
        run: runCallback,
      }),
    }),
    getMockFn: () => {
      return runCallback
    },
  }
})

describe('storeMemory', () => {
  const fixedTimestamp = 1672531200000 // Example static timestamp (e.g., Jan 1, 2023, in milliseconds)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(fixedTimestamp) // Mock Date.now()
  })

  it.each<[{ storageType: StorageType; content: string; category: string | undefined }]>([
    [{ storageType: 'short_term', content: 'foo', category: 'a' }],
    [{ storageType: 'mid_term', content: 'bar', category: 'b' }],
    [{ storageType: 'long_term', content: 'baz', category: '' }],
  ])('returns rowid when storing $storageType', ({ storageType, content, category }) => {
    const runFn = getMockFn() as RunMockedFnType
    runFn.mockReturnValue({ lastInsertRowid: 99 })
    const id = storeMemory(storageType, content, category)
    expect(id).toBe(99)
  })

  it('passes correct parameters to stmt.run()', async () => {
    const runFn = getMockFn() as RunMockedFnType

    runFn.mockReturnValue({ lastInsertRowid: 211 })
    const id = storeMemory('short_term', 'wow', 'category1')
    expect(runFn).toHaveBeenCalledExactlyOnceWith(
      'wow',
      'category1',
      'short_term',
      fixedTimestamp,
      getExpiryTimestamp('short_term'),
    )
    expect(id).toBe(211)
  })

  it('throws if stmt.run() throws', async () => {
    const runFn = getMockFn() as RunMockedFnType
    runFn.mockImplementation(() => {
      throw new Error('fail!')
    })
    expect(() => storeMemory('mid_term', 'abc', 'c')).toThrow('fail!')
  })
})
