import { mkdir } from 'fs/promises'
import { resolve, normalize } from 'path'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createDirectories } from './helper.js'
import { isSubPath } from '../lib/isSubPath'

vi.mock('fs/promises', async () => {
  return { mkdir: vi.fn() }
})

vi.mock('../lib/getWorkingDirectory.js', async () => {
  return { getWorkingDirectory: vi.fn(() => '/mock/working/directory') }
})

vi.mock('../lib/isSubPath.js', async () => {
  return { isSubPath: vi.fn(() => true) }
})

describe('createDirectories', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should create directories recursively', async () => {
    const paths = ['dir1', 'dir2/subdir']
    const fullPaths = paths.map((path) => normalize(resolve('/mock/working/directory', path)))

    await createDirectories(paths)

    for (const fullPath of fullPaths) {
      expect(mkdir).toHaveBeenCalledWith(fullPath, { recursive: true })
    }
  })

  it('should throw an error if a path is outside the working directory', async () => {
    vi.mocked(isSubPath).mockReturnValue(false)
    const paths = ['../outside-dir']

    await expect(createDirectories(paths)).rejects.toThrow(
      'Access forbidden: Cannot create directory outside working directory',
    )
  })

  it('should throw an error if directory creation fails', async () => {
    const paths = ['dir1']
    const fullPath = normalize(resolve('/mock/working/directory', paths[0]))
    vi.mocked(mkdir).mockRejectedValue(new Error('mkdir failed'))

    await expect(createDirectories(paths)).rejects.toThrow(`Failed to create directory: ${fullPath}`)
  })
})
