import { describe, it, expect, vi, beforeEach } from 'vitest'

// ESM and mocks are reset before each test
beforeEach(() => {
  vi.resetModules()
})

describe('searchMemoriesByKeyword', () => {
  it('calls cleanupExpiredMemories before searching', async () => {
    const cleanup = vi.fn()
    vi.doMock('../lib/cleanupExpiredMemories.js', () => ({ cleanupExpiredMemories: cleanup }))
    // Fake DB layer
    const fakeResults = [{ id: 2, content: 'sea', category: 'blue' }]
    vi.doMock('../lib/getDatabase.js', () => ({
      getDatabase: () => ({ prepare: () => ({ all: () => fakeResults }) }),
    }))
    const { searchMemoriesByKeyword } = await import('./helper.js')
    const results = searchMemoriesByKeyword('sea')
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(results).toEqual(fakeResults)
  })
})
