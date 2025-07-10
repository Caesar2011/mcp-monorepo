import { readdir, stat } from 'fs/promises'
import { resolve, relative, isAbsolute, join, normalize } from 'path'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { getDirectoryListing } from './helper.js'
import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'

import type { LsToolParams } from './types.js'

// Mock individual functions
vi.mock('fs/promises', async (importOriginal) => ({
  ...(await importOriginal()),
  readdir: vi.fn(),
  stat: vi.fn(),
}))

vi.mock('path', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>
  return {
    ...original,
    resolve: vi.fn(),
    relative: vi.fn(),
    isAbsolute: vi.fn(),
    join: vi.fn(),
    normalize: original.normalize,
  }
})

vi.mock('../lib/getWorkingDirectory.js', () => ({
  getWorkingDirectory: vi.fn(),
}))

const mockReaddir = vi.mocked(readdir)
const mockStat = vi.mocked(stat)
const mockResolve = vi.mocked(resolve)
const mockRelative = vi.mocked(relative)
const mockIsAbsolute = vi.mocked(isAbsolute)
const mockJoin = vi.mocked(join)
const mockGetWorkingDirectory = vi.mocked(getWorkingDirectory)

const n = normalize

describe('getDirectoryListing', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    mockGetWorkingDirectory.mockReturnValue(n('/working/dir'))
    mockResolve.mockImplementation((...args: string[]) => {
      const lastArg = args[args.length - 1]
      if (lastArg === '.') return n('/working/dir')
      return n(`/working/dir/${lastArg}`)
    })
    mockRelative.mockImplementation((from: string, to: string) => {
      from = n(from)
      to = n(to)
      if (to.startsWith(from)) {
        const rel = to.slice(from.length + 1)
        return rel || ''
      }
      return '../outside'
    })
    mockIsAbsolute.mockImplementation((p: string) => n(p).startsWith(n('/')))
    mockJoin.mockImplementation((...args: string[]) => n(args.join('/')))
  })

  it('should list directory contents successfully', async () => {
    const mockDirents = [
      {
        name: 'folder1',
        isDirectory: () => true,
        isFile: () => false,
      },
      {
        name: 'file.txt',
        isDirectory: () => false,
        isFile: () => true,
      },
    ]

    mockReaddir.mockResolvedValue(mockDirents as never)
    mockStat.mockResolvedValue({ size: 1024 } as never)

    const params: LsToolParams = { path: '.' }
    const result = await getDirectoryListing(params)

    expect(result.directory).toBe(n('/working/dir'))
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0]).toEqual({ name: 'folder1', type: 'DIR' })
    expect(result.entries[1]).toEqual({ name: 'file.txt', type: 'FILE', size: 1024 })
  })

  it('should handle subdirectory path', async () => {
    const mockDirents = [
      {
        name: 'nested.txt',
        isDirectory: () => false,
        isFile: () => true,
      },
    ]

    mockReaddir.mockResolvedValue(mockDirents as never)
    mockStat.mockResolvedValue({ size: 512 } as never)

    const params: LsToolParams = { path: 'subdir' }
    const result = await getDirectoryListing(params)

    expect(mockResolve).toHaveBeenCalledWith(n('/working/dir'), 'subdir')
    expect(result.directory).toBe(n('/working/dir/subdir'))
    expect(result.entries[0]).toEqual({ name: 'nested.txt', type: 'FILE', size: 512 })
  })

  it('should throw error when path is outside working directory', async () => {
    mockRelative.mockReturnValue('../escape')

    const params: LsToolParams = { path: '../outside' }

    await expect(getDirectoryListing(params)).rejects.toThrow(
      'Access forbidden: Directory outside the working directory.',
    )

    expect(mockReaddir).not.toHaveBeenCalled()
  })

  it('should handle empty directory', async () => {
    mockReaddir.mockResolvedValue([])

    const params: LsToolParams = { path: '.' }
    const result = await getDirectoryListing(params)

    expect(result.entries).toHaveLength(0)
    expect(result.directory).toBe(n('/working/dir'))
  })

  it('should filter out non-file and non-directory entries', async () => {
    const mockDirents = [
      {
        name: 'regular-file.txt',
        isDirectory: () => false,
        isFile: () => true,
      },
      {
        name: 'symlink',
        isDirectory: () => false,
        isFile: () => false, // This is neither file nor directory
      },
      {
        name: 'regular-dir',
        isDirectory: () => true,
        isFile: () => false,
      },
    ]

    mockReaddir.mockResolvedValue(mockDirents as never)
    mockStat.mockResolvedValue({ size: 256 } as never)

    const params: LsToolParams = { path: '.' }
    const result = await getDirectoryListing(params)

    expect(result.entries).toHaveLength(2)
    expect(result.entries[0]).toEqual({ name: 'regular-file.txt', type: 'FILE', size: 256 })
    expect(result.entries[1]).toEqual({ name: 'regular-dir', type: 'DIR' })
  })

  it('should handle fs.readdir error', async () => {
    mockReaddir.mockRejectedValue(new Error('Permission denied'))

    const params: LsToolParams = { path: '.' }

    await expect(getDirectoryListing(params)).rejects.toThrow('Permission denied')
  })

  it('should handle fs.stat error for files', async () => {
    const mockDirents = [
      {
        name: 'problematic-file.txt',
        isDirectory: () => false,
        isFile: () => true,
      },
    ]

    mockReaddir.mockResolvedValue(mockDirents as never)
    mockStat.mockRejectedValue(new Error('Stat failed'))

    const params: LsToolParams = { path: '.' }

    await expect(getDirectoryListing(params)).rejects.toThrow('Stat failed')
  })

  it('should handle path validation at working directory root', async () => {
    mockRelative.mockReturnValue('')
    mockReaddir.mockResolvedValue([])

    const params: LsToolParams = { path: '.' }
    const result = await getDirectoryListing(params)

    expect(result.directory).toBe(n('/working/dir'))
    expect(result.entries).toHaveLength(0)
  })

  it('should handle special characters in filenames', async () => {
    const mockDirents = [
      {
        name: 'file with spaces.txt',
        isDirectory: () => false,
        isFile: () => true,
      },
      {
        name: 'file@#$%.txt',
        isDirectory: () => false,
        isFile: () => true,
      },
    ]

    mockReaddir.mockResolvedValue(mockDirents as never)
    mockStat.mockResolvedValue({ size: 100 } as never)

    const params: LsToolParams = { path: '.' }
    const result = await getDirectoryListing(params)

    expect(result.entries).toHaveLength(2)
    expect(result.entries[0].name).toBe('file with spaces.txt')
    expect(result.entries[1].name).toBe('file@#$%.txt')
  })

  it('should handle large files', async () => {
    const mockDirents = [
      {
        name: 'large-file.bin',
        isDirectory: () => false,
        isFile: () => true,
      },
    ]

    mockReaddir.mockResolvedValue(mockDirents as never)
    mockStat.mockResolvedValue({ size: 1073741824 } as never) // 1GB

    const params: LsToolParams = { path: '.' }
    const result = await getDirectoryListing(params)

    expect(result.entries[0]).toEqual({
      name: 'large-file.bin',
      type: 'FILE',
      size: 1073741824,
    })
  })

  it('should handle zero-byte files', async () => {
    const mockDirents = [
      {
        name: 'empty-file.txt',
        isDirectory: () => false,
        isFile: () => true,
      },
    ]

    mockReaddir.mockResolvedValue(mockDirents as never)
    mockStat.mockResolvedValue({ size: 0 } as never)

    const params: LsToolParams = { path: '.' }
    const result = await getDirectoryListing(params)

    expect(result.entries[0]).toEqual({
      name: 'empty-file.txt',
      type: 'FILE',
      size: 0,
    })
  })

  it('should handle path with no explicit path parameter', async () => {
    mockReaddir.mockResolvedValue([])

    const params: LsToolParams = {} // No path specified
    const result = await getDirectoryListing(params)

    expect(mockResolve).toHaveBeenCalledWith(n('/working/dir'), '.')
    expect(result.directory).toBe(n('/working/dir'))
  })

  it('should handle isSubPath validation correctly', async () => {
    // Test case where relative path starts with .. (should be blocked)
    mockRelative.mockReturnValue('../../../etc')

    const params: LsToolParams = { path: '../../../etc' }

    await expect(getDirectoryListing(params)).rejects.toThrow(
      'Access forbidden: Directory outside the working directory.',
    )
  })

  it('should handle isSubPath validation for absolute paths in relative result', async () => {
    // Test case where relative path is absolute (should be blocked)
    mockRelative.mockReturnValue('/etc/passwd')
    mockIsAbsolute.mockReturnValue(true)

    const params: LsToolParams = { path: 'some-path' }

    await expect(getDirectoryListing(params)).rejects.toThrow(
      'Access forbidden: Directory outside the working directory.',
    )
  })
})
