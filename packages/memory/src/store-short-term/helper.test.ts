import { describe, it, expect, vi, beforeEach } from 'vitest'

import { storeShortTermMemory } from './helper.js'
// @ts-expect-error Test implementation only
import { getMockFn } from '../lib/getDatabase.js'

vi.mock('../lib/getDatabase.js', () => {
  const runMock = vi.fn(() => ({ lastInsertRowid: 123 }))
  return {
    getDatabase: () => ({
      prepare: () => ({
        run: runMock,
      }),
    }),
    getMockFn: () => runMock,
  }
})

describe('storeShortTermMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should insert a short-term memory and return an ID', () => {
    const id = storeShortTermMemory('Test short memory', 'test')
    expect(id).toBe(123)
  })

  it('throws if DB run fails', () => {
    getMockFn().mockImplementation(() => {
      throw new Error('fail!')
    })
    expect(() => storeShortTermMemory('fail', 'test')).toThrow('fail!')
  })
})
