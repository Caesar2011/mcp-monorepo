import { describe, it, expect, vi, afterEach } from 'vitest'

import { formatResponse, formatError } from './formatter.js'
import { lsHandler } from './handler.js'
import { getDirectoryListing } from './helper'

// Mock getDirectoryListing and formatter
vi.mock('./helper.js', () => ({
  getDirectoryListing: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatResponse: vi.fn(),
  formatError: vi.fn(),
}))

describe('lsHandler', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })
  it('returns formatted directory contents', async () => {
    vi.mocked(getDirectoryListing).mockResolvedValue({ entries: [{ name: 'test', type: 'DIR' }], directory: '/dir' })
    vi.mocked(formatResponse).mockReturnValue('formatted')
    const res = await lsHandler({ path: '.' })
    expect(res.content[0].text).toBe('formatted')
    expect(getDirectoryListing).toHaveBeenCalled()
  })
  it('returns formatted error on failure', async () => {
    vi.mocked(getDirectoryListing).mockRejectedValue(new Error('fail err'))
    vi.mocked(formatError).mockReturnValue('ERRTXT')
    const res = await lsHandler({ path: 'forbidden' })
    expect(res.content[0].text).toBe('ERRTXT')
    expect(res.content[0]._meta.stderr).toBe('fail err')
  })
})
