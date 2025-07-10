import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let mockRun: ReturnType<typeof vi.fn>
let mockPrepare: ReturnType<typeof vi.fn>
let originalLog: typeof console.log

beforeEach(() => {
  vi.resetModules()
  mockRun = vi.fn()
  mockPrepare = vi.fn(() => ({ run: mockRun }))

  vi.doMock('./getDatabase.js', () => ({
    getDatabase: () => ({ prepare: mockPrepare }),
  }))

  // Mock console.log
  originalLog = console.log
  console.log = vi.fn()
})

afterEach(() => {
  vi.resetAllMocks()
  vi.clearAllMocks()
  vi.unmock('./getDatabase.js')
  console.log = originalLog
})

describe('cleanupExpiredMemories (DB)', () => {
  it('logs nothing when no expired rows were deleted', async () => {
    mockRun.mockReturnValueOnce({ changes: 0 })
    const { cleanupExpiredMemories } = await import('./cleanupExpiredMemories.js')
    expect(cleanupExpiredMemories()).toBeUndefined()
    expect(console.log).not.toHaveBeenCalled()
  })

  it('logs row count when expired memories are deleted', async () => {
    mockRun.mockReturnValueOnce({ changes: 5 })
    const { cleanupExpiredMemories } = await import('./cleanupExpiredMemories.js')
    expect(cleanupExpiredMemories()).toBeUndefined()
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('5 expired memories'))
  })

  it('handles result object missing .changes gracefully', async () => {
    mockRun.mockReturnValueOnce({})
    const { cleanupExpiredMemories } = await import('./cleanupExpiredMemories.js')
    expect(cleanupExpiredMemories()).toBeUndefined()
    expect(console.log).not.toHaveBeenCalled()
  })

  it('throws if the DB layer throws', async () => {
    mockRun.mockImplementationOnce(() => {
      throw new Error('fail!')
    })
    const { cleanupExpiredMemories } = await import('./cleanupExpiredMemories.js')
    expect(() => cleanupExpiredMemories()).toThrow('fail!')
  })
})
