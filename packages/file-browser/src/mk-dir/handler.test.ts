import { describe, it, expect, vi, beforeEach } from 'vitest'

import { mkDirHandler } from './handler.js'
import { createDirectories } from './helper.js'

vi.mock('./helper.js', async () => {
  return { createDirectories: vi.fn() }
})

describe('mkDirHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a success response when directories are created', async () => {
    const paths = ['dir1', 'dir2/subdir']
    vi.mocked(createDirectories).mockResolvedValue(paths)

    const result = await mkDirHandler({ paths })

    expect(createDirectories).toHaveBeenCalledWith(paths)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('Successfully created the following directories')
  })

  it('should return an error response when directory creation fails', async () => {
    const paths = ['dir1']
    vi.mocked(createDirectories).mockRejectedValue(new Error('mkdir failed'))

    const result = await mkDirHandler({ paths })

    expect(createDirectories).toHaveBeenCalledWith(paths)
    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('Error: mkdir failed')
  })
})
