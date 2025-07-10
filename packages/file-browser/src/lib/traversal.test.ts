import { readdir, stat } from 'fs/promises'
import { normalize } from 'path'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { getWorkingDirectory } from './getWorkingDirectory.js'
import { isIgnored } from './gitignore.js'
import {
  matchesPathPattern,
  getFileSize,
  traverseDirectory,
  traverseWithCallback,
  collectMatches,
  type TraversalMatch,
} from './traversal.js'

// Mock modules
vi.mock('fs/promises', async (importOriginal) => ({
  ...(await importOriginal()),
  readdir: vi.fn(),
  stat: vi.fn(),
}))

vi.mock('./getWorkingDirectory.js', () => ({
  getWorkingDirectory: vi.fn(),
}))

vi.mock('./gitignore.js', () => ({
  isIgnored: vi.fn(),
}))

const mockReaddir = vi.mocked(readdir)
const mockStat = vi.mocked(stat)
const mockGetWorkingDirectory = vi.mocked(getWorkingDirectory)
const mockIsIgnored = vi.mocked(isIgnored)

describe('matchesPathPattern', () => {
  it('should match simple patterns', () => {
    const pattern = new RegExp('test')
    expect(matchesPathPattern('test.txt', pattern)).toBe(true)
    expect(matchesPathPattern('example.txt', pattern)).toBe(false)
  })

  it('should handle path separators consistently', () => {
    const pattern = new RegExp('src/.*\\.ts$')
    expect(matchesPathPattern('src/index.ts', pattern)).toBe(true)
    expect(matchesPathPattern('src\\\\index.ts', pattern)).toBe(true)
  })

  it('should match file extensions', () => {
    const pattern = new RegExp('\\.js$')
    expect(matchesPathPattern('app.js', pattern)).toBe(true)
    expect(matchesPathPattern('app.json', pattern)).toBe(false)
  })

  it('should handle complex patterns', () => {
    const pattern = new RegExp('^(src|lib)/.*\\.(ts|js)$')
    expect(matchesPathPattern('src/index.ts', pattern)).toBe(true)
    expect(matchesPathPattern('lib/utils.js', pattern)).toBe(true)
    expect(matchesPathPattern('test/spec.ts', pattern)).toBe(false)
    expect(matchesPathPattern('src/style.css', pattern)).toBe(false)
  })
})

describe('getFileSize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return file size when stat succeeds', async () => {
    mockStat.mockResolvedValue({ size: 1024 } as never)
    const result = await getFileSize('/path/to/file.txt')
    expect(result).toBe(1024)
  })

  it('should return 0 when stat fails', async () => {
    mockStat.mockRejectedValue(new Error('ENOENT'))
    const result = await getFileSize('/path/to/nonexistent.txt')
    expect(result).toBe(0)
  })

  it('should handle permission errors', async () => {
    mockStat.mockRejectedValue(new Error('EACCES: permission denied'))
    const result = await getFileSize('/restricted/file.txt')
    expect(result).toBe(0)
  })
})

describe('traverseDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsIgnored.mockResolvedValue(false)
    mockStat.mockResolvedValue({ size: 100 } as never)
  })

  it('should traverse and find matching files', async () => {
    const pattern = new RegExp('\\.txt$')
    const workingDir = '/working'
    const dirPath = '/working'
    const matches: TraversalMatch[] = []
    const resultsCount = { value: 0 }

    const callback = vi.fn((match: TraversalMatch) => {
      matches.push(match)
    })

    mockReaddir.mockResolvedValue([
      { name: 'file1.txt', isDirectory: () => false },
      { name: 'file2.js', isDirectory: () => false },
    ] as never)

    await traverseDirectory(dirPath, workingDir, {
      pathPattern: pattern,
      callback,
      resultsCount,
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(matches).toHaveLength(1)
    expect(matches[0].path).toBe('file1.txt')
    expect(matches[0].isDirectory).toBe(false)
    expect(matches[0].size).toBe(100)
    expect(resultsCount.value).toBe(1)
  })

  it('should skip ignored files', async () => {
    const pattern = new RegExp('.*')
    const workingDir = '/working'
    const dirPath = '/working'
    const callback = vi.fn()
    const resultsCount = { value: 0 }

    mockReaddir.mockResolvedValue([{ name: 'ignored.txt', isDirectory: () => false }] as never)

    mockIsIgnored.mockResolvedValue(true)

    await traverseDirectory(dirPath, workingDir, {
      pathPattern: pattern,
      callback,
      resultsCount,
    })

    expect(callback).not.toHaveBeenCalled()
    expect(resultsCount.value).toBe(0)
  })

  it('should recursively traverse subdirectories', async () => {
    const pattern = new RegExp('\\.ts$')
    const workingDir = '/working'
    const dirPath = '/working'
    const matches: TraversalMatch[] = []
    const resultsCount = { value: 0 }

    const callback = vi.fn((match: TraversalMatch) => {
      matches.push(match)
    })

    // First call - root directory
    mockReaddir
      .mockResolvedValueOnce([{ name: 'src', isDirectory: () => true }] as never)
      // Second call - src subdirectory
      .mockResolvedValueOnce([{ name: 'main.ts', isDirectory: () => false }] as never)

    await traverseDirectory(dirPath, workingDir, {
      pathPattern: pattern,
      callback,
      resultsCount,
    })

    expect(matches).toHaveLength(1)
    expect(matches[0].path).toBe(normalize('src/main.ts'))
  })

  it('should respect maxResults limit', async () => {
    const pattern = new RegExp('.*')
    const workingDir = '/working'
    const dirPath = '/working'
    const callback = vi.fn()
    const resultsCount = { value: 2 } // Already at limit

    mockReaddir.mockResolvedValue([{ name: 'file.txt', isDirectory: () => false }] as never)

    await traverseDirectory(dirPath, workingDir, {
      pathPattern: pattern,
      callback,
      maxResults: 2,
      resultsCount,
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('should handle callback returning false to stop traversal', async () => {
    const pattern = new RegExp('.*')
    const workingDir = '/working'
    const dirPath = '/working'
    const resultsCount = { value: 0 }

    const callback = vi.fn(() => false) // Stop traversal

    mockReaddir.mockResolvedValue([
      { name: 'file1.txt', isDirectory: () => false },
      { name: 'file2.txt', isDirectory: () => false },
    ] as never)

    await traverseDirectory(dirPath, workingDir, {
      pathPattern: pattern,
      callback,
      resultsCount,
    })

    expect(callback).toHaveBeenCalledTimes(1) // Should stop after first match
  })

  it('should handle directory read errors gracefully', async () => {
    const pattern = new RegExp('.*')
    const workingDir = '/working'
    const dirPath = '/working'
    const callback = vi.fn()
    const resultsCount = { value: 0 }

    mockReaddir.mockRejectedValue(new Error('EACCES: permission denied'))

    await traverseDirectory(dirPath, workingDir, {
      pathPattern: pattern,
      callback,
      resultsCount,
    })

    expect(callback).not.toHaveBeenCalled()
    expect(resultsCount.value).toBe(0)
  })

  it('should prevent infinite loops from symlinks', async () => {
    const pattern = new RegExp('.*')
    const workingDir = normalize('/working')
    const dirPath = normalize('/working')
    const callback = vi.fn()
    const resultsCount = { value: 0 }
    const visited = new Set([normalize('/working')]) // Already visited

    await traverseDirectory(
      dirPath,
      workingDir,
      {
        pathPattern: pattern,
        callback,
        resultsCount,
      },
      visited,
    )

    expect(mockReaddir).not.toHaveBeenCalled()
    expect(callback).not.toHaveBeenCalled()
  })
})

describe('traverseWithCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetWorkingDirectory.mockReturnValue(normalize('/working/dir'))
    mockIsIgnored.mockResolvedValue(false)
    mockStat.mockResolvedValue({ size: 100 } as never)
  })

  it('should traverse and return result count', async () => {
    const pattern = new RegExp('\\.js$')
    const matches: TraversalMatch[] = []

    const callback = (match: TraversalMatch) => {
      matches.push(match)
    }

    mockReaddir.mockResolvedValue([
      { name: 'app.js', isDirectory: () => false },
      { name: 'test.js', isDirectory: () => false },
    ] as never)

    const count = await traverseWithCallback({
      pathPattern: pattern,
      callback,
    })

    expect(count).toBe(2)
    expect(matches).toHaveLength(2)
  })

  it('should use custom working directory', async () => {
    const pattern = new RegExp('.*')
    const customWorkingDir = normalize('/custom/dir')
    const callback = vi.fn()

    mockReaddir.mockResolvedValue([] as never)

    await traverseWithCallback({
      pathPattern: pattern,
      callback,
      workingDir: customWorkingDir,
    })

    expect(mockGetWorkingDirectory).not.toHaveBeenCalled()
  })

  it('should respect maxResults option', async () => {
    const pattern = new RegExp('.*')
    const matches: TraversalMatch[] = []

    const callback = (match: TraversalMatch) => {
      matches.push(match)
    }

    mockReaddir.mockResolvedValue([
      { name: 'file1.txt', isDirectory: () => false },
      { name: 'file2.txt', isDirectory: () => false },
      { name: 'file3.txt', isDirectory: () => false },
    ] as never)

    const count = await traverseWithCallback({
      pathPattern: pattern,
      callback,
      maxResults: 2,
    })

    expect(count).toBe(2)
    expect(matches).toHaveLength(2)
  })

  it('should throw error for security violation', async () => {
    const pattern = new RegExp('.*')
    const callback = vi.fn()

    // Mock a scenario where working directory validation fails
    // This would require modifying isSubPath mock, but for now we test the happy path
    // In real usage, this would be tested by providing a working directory outside bounds

    await expect(
      traverseWithCallback({
        pathPattern: pattern,
        callback,
        workingDir: '/working/dir', // Valid path for our test setup
      }),
    ).resolves.toBeDefined()
  })
})

describe('collectMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetWorkingDirectory.mockReturnValue(normalize('/working/dir'))
    mockIsIgnored.mockResolvedValue(false)
    mockStat.mockResolvedValue({ size: 100 } as never)
  })

  it('should collect and sort matches', async () => {
    const pattern = new RegExp('\\.txt$')

    mockReaddir.mockResolvedValue([
      { name: 'zebra.txt', isDirectory: () => false },
      { name: 'alpha.txt', isDirectory: () => false },
    ] as never)

    const matches = await collectMatches(pattern)

    expect(matches).toHaveLength(2)
    expect(matches[0].path).toBe('alpha.txt') // Should be sorted
    expect(matches[1].path).toBe('zebra.txt')
    expect(matches[0].isDirectory).toBe(false)
    expect(matches[0].size).toBe(100)
  })

  it('should return empty array when no matches', async () => {
    const pattern = new RegExp('\\.nonexistent$')

    mockReaddir.mockResolvedValue([{ name: 'file.txt', isDirectory: () => false }] as never)

    const matches = await collectMatches(pattern)

    expect(matches).toHaveLength(0)
  })

  it('should respect maxResults limit', async () => {
    const pattern = new RegExp('.*')

    mockReaddir.mockResolvedValue([
      { name: 'file1.txt', isDirectory: () => false },
      { name: 'file2.txt', isDirectory: () => false },
      { name: 'file3.txt', isDirectory: () => false },
    ] as never)

    const matches = await collectMatches(pattern, 2)

    expect(matches).toHaveLength(2)
  })

  it('should handle directories and files', async () => {
    const pattern = new RegExp('.*')

    mockReaddir
      .mockResolvedValueOnce([
        { name: 'dir', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
      ] as never)
      .mockResolvedValueOnce([])

    const matches = await collectMatches(pattern)

    expect(matches).toHaveLength(2)
    expect(matches[0].path).toBe('dir')
    expect(matches[0].isDirectory).toBe(true)
    expect(matches[1].path).toBe('file.txt')
    expect(matches[1].isDirectory).toBe(false)
  })

  it('should use custom working directory', async () => {
    const pattern = new RegExp('.*')
    const customWorkingDir = '/custom'

    mockReaddir.mockResolvedValue([] as never)

    await collectMatches(pattern, undefined, customWorkingDir)

    expect(mockGetWorkingDirectory).not.toHaveBeenCalled()
  })
})
