import { rename } from 'fs/promises'
import { normalize, resolve } from 'path'

import { describe, it, expect, vi } from 'vitest'

import { movePaths } from './helper.js'
import { isSubPath } from '../lib/isSubPath.js'

vi.mock('fs/promises', () => ({
  rename: vi.fn(),
}))

vi.mock('../lib/getWorkingDirectory', () => ({
  getWorkingDirectory: vi.fn(() => '/working/directory'),
}))

vi.mock('../lib/isSubPath', () => ({
  isSubPath: vi.fn(() => true),
}))

describe('movePaths', () => {
  it('should move all source paths to target paths', async () => {
    const sourcePaths = ['file1.txt', 'file2.txt']
    const targetPaths = ['newFile1.txt', 'newFile2.txt']

    await movePaths(sourcePaths, targetPaths)

    expect(rename).toHaveBeenCalledTimes(2)
    expect(rename).toHaveBeenCalledWith(
      normalize(resolve('/working/directory/file1.txt')),
      normalize(resolve('/working/directory/newFile1.txt')),
    )
    expect(rename).toHaveBeenCalledWith(
      normalize(resolve('/working/directory/file2.txt')),
      normalize(resolve('/working/directory/newFile2.txt')),
    )
  })

  it('should throw an error if sourcePaths and targetPaths length mismatch', async () => {
    const sourcePaths = ['file1.txt']
    const targetPaths = ['newFile1.txt', 'newFile2.txt']

    await expect(movePaths(sourcePaths, targetPaths)).rejects.toThrow(
      'Source and target paths must have the same length.',
    )
  })

  it('should throw an error if a path is outside the working directory', async () => {
    vi.mocked(isSubPath).mockReturnValueOnce(false)

    const sourcePaths = ['file1.txt']
    const targetPaths = ['newFile1.txt']

    await expect(movePaths(sourcePaths, targetPaths)).rejects.toThrow(
      'Access forbidden: Paths must remain within the working directory',
    )
  })

  it('should throw an error if rename fails', async () => {
    vi.mocked(rename).mockRejectedValueOnce(new Error('Rename operation failed'))

    const sourcePaths = ['file1.txt']
    const targetPaths = ['newFile1.txt']

    await expect(movePaths(sourcePaths, targetPaths)).rejects.toThrow(
      'Failed to move path: file1.txt -> newFile1.txt. Error: Rename operation failed',
    )
  })
})
