import { describe, it, expect, vi, beforeEach } from 'vitest'

// Isolate ESM for each test
beforeEach(() => {
  vi.resetModules()
})

describe('getAllMemories', () => {
  it('calls cleanupExpiredMemories before querying db', async () => {
    const cleanup = vi.fn()
    vi.doMock('../lib/cleanupExpiredMemories.js', () => ({ cleanupExpiredMemories: cleanup }))
    // Mock DB fetch to avoid real DB access
    const fakeMemories = [{ id: 1, content: 'foo' }]
    vi.doMock('../lib/getDatabase.js', () => ({
      getDatabase: () => ({ prepare: () => ({ all: () => fakeMemories }) }),
    }))
    const { getAllMemories } = await import('./helper.js')
    const res = getAllMemories()
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(res).toEqual(fakeMemories)
  })
})
