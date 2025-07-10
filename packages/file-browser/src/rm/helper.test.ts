import { rm } from 'fs/promises'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { removePaths } from './helper.js'
import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'
import { isSubPath } from '../lib/isSubPath.js'

vi.mock('../lib/isSubPath.js', () => ({
  isSubPath: vi.fn(),
}))
vi.mock('fs/promises', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  rm: vi.fn(),
}))
vi.mock('../lib/getWorkingDirectory.js', () => ({
  getWorkingDirectory: vi.fn(),
}))

describe('removePaths', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getWorkingDirectory).mockReturnValue('/mock/working/directory')
  })

  it('should remove files and directories within the working directory', async () => {
    vi.mocked(isSubPath).mockReturnValue(true)
    vi.mocked(rm).mockResolvedValue(undefined)

    const result = await removePaths(['file.txt', 'folder'])

    expect(result).toEqual(['file.txt', 'folder'])
    expect(rm).toHaveBeenCalledTimes(2)
    expect(rm).toHaveBeenCalledWith(expect.stringContaining('file.txt'), { force: true, recursive: true })
    expect(rm).toHaveBeenCalledWith(expect.stringContaining('folder'), { force: true, recursive: true })
  })

  it('should throw an error if a path is outside the working directory', async () => {
    vi.mocked(isSubPath).mockReturnValue(false)

    await expect(async () => await removePaths(['../file.txt'])).rejects.toThrow('Access forbidden')
    expect(rm).not.toHaveBeenCalled()
  })

  it('should throw an error if a deletion operation fails', async () => {
    vi.mocked(isSubPath).mockReturnValue(true)
    vi.mocked(rm).mockRejectedValue(new Error('Failed to delete'))

    await expect(removePaths(['file.txt'])).rejects.toThrow('Failed to delete')
  })
})
