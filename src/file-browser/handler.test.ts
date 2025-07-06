import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest'
import { resolve, join, dirname, normalize } from 'path'

// Mock all dependencies
vi.mock('../utils.js', () => ({
  getWorkingDirectory: vi.fn(() => '/test/cwd'),
}))

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
  unlink: vi.fn(),
}))

vi.mock('child_process', () => ({
  exec: vi.fn(),
}))

vi.mock('./helpers.js', () => ({
  buildDirectoryTree: vi.fn(),
  getGitignorePatterns: vi.fn(() => Promise.resolve([])),
  searchRecursiveForFiles: vi.fn(),
  searchRecursiveForPattern: vi.fn(),
  validatePath: vi.fn(),
}))

import {
  applyGitDiffHandler,
  rmHandler,
  moveHandler,
  mkdirHandler,
  searchHandler,
  lsHandler,
  treeHandler,
  grepHandler,
  grepReplaceHandler,
  openHandler,
  openMultipleHandler,
  writeHandler,
} from './handler.js'

import { mkdir, readdir, readFile, stat, writeFile, rename, rm, unlink } from 'fs/promises'
import {
  validatePath,
  getGitignorePatterns,
  searchRecursiveForFiles,
  searchRecursiveForPattern,
  buildDirectoryTree,
} from './helpers.js'
import { Stats } from 'node:fs'

// Mock modules
vi.mock('child_process', () => ({
  exec: vi.fn(),
}))

vi.mock('util', () => {
  const mockExec = vi.fn(() => ({ stdout: 'string', stderr: 'string' }))
  return {
    _mockExec: mockExec,
    promisify: vi.fn(() => mockExec),
  }
})

describe('Handler Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('applyGitDiffHandler', () => {
    let mockExec: MockedFunction<() => { stdout: string; stderr: string }>
    beforeEach(async () => {
      const { _mockExec } = (await import('util')) as unknown as {
        _mockExec: MockedFunction<() => { stdout: string; stderr: string }>
      }
      mockExec = _mockExec
    })

    it('should apply git diff successfully', async () => {
      mockExec.mockResolvedValue({ stdout: 'Applied successfully', stderr: '' })
      vi.mocked(writeFile).mockResolvedValue(undefined)
      vi.mocked(unlink).mockResolvedValue(undefined)

      const result = await applyGitDiffHandler({ diff: 'test diff content' })

      expect(writeFile).toHaveBeenCalledWith(normalize('/test/cwd/temp.diff'), 'test diff content\n', 'utf-8')
      expect(mockExec).toHaveBeenCalledWith(
        `git apply --reject --ignore-whitespace "${resolve('/test/cwd/temp.diff')}"`,
        { cwd: '/test/cwd', killSignal: 'SIGKILL' },
      )
      expect(unlink).toHaveBeenCalledWith(normalize('/test/cwd/temp.diff'))
      expect(result.content?.[0]?.text).toContain('Successfully applied git diff')
    })

    it('should handle git apply errors and cleanup temp file', async () => {
      mockExec.mockRejectedValue(new Error('Git apply failed'))
      vi.mocked(writeFile).mockResolvedValue(undefined)
      vi.mocked(unlink).mockResolvedValue(undefined)

      const result = await applyGitDiffHandler({ diff: 'invalid diff' })

      expect(unlink).toHaveBeenCalledWith(normalize('/test/cwd/temp.diff'))
      expect(result.content?.[0]?.text).toContain('Error applying git diff')
    })

    it('should handle cleanup failure gracefully', async () => {
      mockExec.mockRejectedValue(new Error('Git apply failed'))
      vi.mocked(writeFile).mockResolvedValue(undefined)
      vi.mocked(unlink).mockRejectedValue(new Error('Cleanup failed'))

      const result = await applyGitDiffHandler({ diff: 'invalid diff' })

      expect(result.content?.[0]?.text).toContain('Error applying git diff')
    })
  })

  describe('rmHandler', () => {
    it('should remove file/directory successfully', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(rm).mockResolvedValue(undefined)

      const result = await rmHandler({ targetPath: 'test/file.txt' })

      expect(validatePath).toHaveBeenCalledWith('/test/cwd', 'test/file.txt')
      expect(rm).toHaveBeenCalledWith(resolve('/test/cwd', 'test/file.txt'), { recursive: true, force: true })
      expect(result.content?.[0]?.text).toContain('Successfully removed test/file.txt')
      expect(result.content?.[0]?._meta).toBe(undefined)
    })

    it('should reject paths outside working directory', async () => {
      vi.mocked(validatePath).mockReturnValue(false)

      const result = await rmHandler({ targetPath: '../outside/file.txt' })

      expect(result.content?.[0]?.text).toContain('Target path is outside working directory')
      expect(rm).not.toHaveBeenCalled()
    })

    it('should handle removal errors', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(rm).mockRejectedValue(new Error('Permission denied'))

      const result = await rmHandler({ targetPath: 'test/file.txt' })

      expect(result.content?.[0]?.text).toContain('Error removing target: Permission denied')
    })
  })

  describe('moveHandler', () => {
    it('should move file successfully', async () => {
      vi.mocked(validatePath).mockReturnValueOnce(true).mockReturnValueOnce(true)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(rename).mockResolvedValue(undefined)

      const result = await moveHandler({
        sourcePath: 'source/file.txt',
        destinationPath: 'dest/file.txt',
      })

      expect(validatePath).toHaveBeenCalledWith('/test/cwd', 'source/file.txt')
      expect(validatePath).toHaveBeenCalledWith('/test/cwd', 'dest/file.txt')
      expect(mkdir).toHaveBeenCalledWith(dirname(resolve('/test/cwd', 'dest/file.txt')), { recursive: true })
      expect(rename).toHaveBeenCalled()
      expect(result.content?.[0]?.text).toContain('Successfully moved')
      expect(result.content?.[0]?._meta).toBe(undefined)
    })

    it('should reject source path outside working directory', async () => {
      vi.mocked(validatePath).mockReturnValueOnce(false)

      const result = await moveHandler({
        sourcePath: '../outside/file.txt',
        destinationPath: 'dest/file.txt',
      })

      expect(result.content?.[0]?.text).toContain('Source path is outside working directory')
    })

    it('should reject destination path outside working directory', async () => {
      vi.mocked(validatePath).mockReturnValueOnce(true).mockReturnValueOnce(false)

      const result = await moveHandler({
        sourcePath: 'source/file.txt',
        destinationPath: '../outside/file.txt',
      })

      expect(result.content?.[0]?.text).toContain('Destination path is outside working directory')
    })

    it('should handle move errors', async () => {
      vi.mocked(validatePath).mockReturnValueOnce(true).mockReturnValueOnce(true)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(rename).mockRejectedValue(new Error('File not found'))

      const result = await moveHandler({
        sourcePath: 'source/file.txt',
        destinationPath: 'dest/file.txt',
      })

      expect(result.content?.[0]?.text).toContain('Error moving file: File not found')
    })
  })

  describe('mkdirHandler', () => {
    it('should create directory successfully', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      const result = await mkdirHandler({ dirPath: 'new/directory' })

      expect(validatePath).toHaveBeenCalledWith('/test/cwd', 'new/directory')
      expect(mkdir).toHaveBeenCalledWith(resolve('/test/cwd', 'new/directory'), { recursive: true })
      expect(result.content?.[0]?.text).toContain('Successfully created directory new/directory')
      expect(result.content?.[0]?._meta).toBe(undefined)
    })

    it('should reject paths outside working directory', async () => {
      vi.mocked(validatePath).mockReturnValue(false)

      const result = await mkdirHandler({ dirPath: '../outside' })

      expect(result.content?.[0]?.text).toContain('Directory path is outside working directory')
      expect(mkdir).not.toHaveBeenCalled()
    })

    it('should handle mkdir errors', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(mkdir).mockRejectedValue(new Error('Permission denied'))

      const result = await mkdirHandler({ dirPath: 'new/directory' })

      expect(result.content?.[0]?.text).toContain('Error creating directory: Permission denied')
    })
  })

  describe('searchHandler', () => {
    it('should find files matching pattern', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(getGitignorePatterns).mockResolvedValue([])
      vi.mocked(searchRecursiveForFiles).mockImplementation(async (_1, _2, _3, _4, results) => {
        results.push('file1.txt', 'file2.txt')
      })

      const result = await searchHandler({ pattern: '*.txt' })

      expect(result.content?.[0]?.text).toContain('Found files:\nfile1.txt\nfile2.txt')
      expect(result.content?.[0]?._meta).toBe(undefined)
    })

    it('should handle no matches', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(getGitignorePatterns).mockResolvedValue([])
      vi.mocked(searchRecursiveForFiles).mockImplementation(async () => {})

      const result = await searchHandler({ pattern: '*.nonexistent' })

      expect(result.content?.[0]?.text).toContain('No files found matching pattern')
      expect(result.content?.[0]?._meta).toBe(undefined)
    })

    it('should handle security violation', async () => {
      vi.mocked(validatePath).mockReturnValue(false)

      const result = await searchHandler({ pattern: '*.txt' })

      expect(result.content?.[0]?.text).toContain('Current directory is outside working directory')
    })
  })

  describe('lsHandler', () => {
    it('should list directory contents', async () => {
      vi.mocked(readdir).mockResolvedValue(['file1.txt', 'dir1'] as never)
      vi.mocked(stat)
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true, size: 100 } as Stats)
        .mockResolvedValueOnce({ isDirectory: () => true, isFile: () => false, size: 0 } as Stats)

      const result = await lsHandler({ path: undefined })

      expect(readdir).toHaveBeenCalledWith('/test/cwd')
      expect(result.content?.[0]?.text).toContain('Contents of .')
      expect(result.content?.[0]?.text).toContain('FILE file1.txt (100 bytes)')
      expect(result.content?.[0]?.text).toContain('DIR  dir1')
    })

    it('should list subdirectory contents', async () => {
      vi.mocked(readdir).mockResolvedValue(['subfile.txt'] as never)
      vi.mocked(stat).mockResolvedValue({ isDirectory: () => false, isFile: () => true, size: 50 } as Stats)

      const result = await lsHandler({ path: 'subdir' })

      expect(readdir).toHaveBeenCalledWith(join('/test/cwd', 'subdir'))
      expect(result.content?.[0]?.text).toContain('Contents of subdir')
    })

    it('should handle readdir errors', async () => {
      vi.mocked(readdir).mockRejectedValue(new Error('Directory not found'))

      const result = await lsHandler({ path: 'nonexistent' })

      expect(result.content?.[0]?.text).toContain('Error listing directory: Directory not found')
    })
  })

  describe('treeHandler', () => {
    it('should build directory tree', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(getGitignorePatterns).mockResolvedValue([])
      vi.mocked(buildDirectoryTree).mockImplementation(async (_0, _1, _2, _3, _4, results, fileCount) => {
        results.push('├── file1.txt', '└── dir1/')
        fileCount.count = 2
      })

      const result = await treeHandler({ depth: 3 })

      expect(result.content?.[0]?.text).toContain('Directory tree (max depth: 3, showing 2 items)')
      expect(result.content?.[0]?.text).toContain('├── file1.txt')
      expect(result.content?.[0]?._meta).toBe(undefined)
    })

    it('should use default depth', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(getGitignorePatterns).mockResolvedValue([])
      vi.mocked(buildDirectoryTree).mockImplementation(async (_0, _1, _2, _3, _4, _5, fileCount) => {
        fileCount.count = 0
      })

      await treeHandler({ depth: 5 })

      expect(buildDirectoryTree).toHaveBeenCalledWith(
        '/test/cwd',
        '/test/cwd',
        1,
        5,
        [],
        expect.any(Array),
        expect.any(Object),
      )
    })

    it('should handle security violation', async () => {
      vi.mocked(validatePath).mockReturnValue(false)

      const result = await treeHandler({ depth: 3 })

      expect(result.content?.[0]?.text).toContain('Current directory is outside working directory')
    })
  })

  describe('grepHandler', () => {
    it('should find pattern matches in files', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(getGitignorePatterns).mockResolvedValue([])
      vi.mocked(searchRecursiveForPattern).mockImplementation(async (_0, _1, _2, _3, _4, results, matchCount) => {
        results.push('file1.txt:1:matching line')
        matchCount.count = 1
      })

      const result = await grepHandler({ pattern: 'test', filePattern: '*.txt' })

      expect(result.content?.[0]?.text).toContain('Found 1 matches')
      expect(result.content?.[0]?.text).toContain('file1.txt:1:matching line')
    })

    it('should handle no matches', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(getGitignorePatterns).mockResolvedValue([])
      vi.mocked(searchRecursiveForPattern).mockImplementation(async () => {})

      const result = await grepHandler({ pattern: 'nonexistent' })

      expect(result.content?.[0]?.text).toContain('No matches found')
    })

    it('should use default file pattern', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(getGitignorePatterns).mockResolvedValue([])
      vi.mocked(searchRecursiveForPattern).mockImplementation(async () => {})

      await grepHandler({ pattern: 'test' })

      expect(searchRecursiveForPattern).toHaveBeenCalledWith(
        '/test/cwd',
        '/test/cwd',
        'test',
        '*',
        [],
        expect.any(Array),
        expect.any(Object),
      )
    })
  })

  describe('grepReplaceHandler', () => {
    it('should replace pattern in file', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(readFile).mockResolvedValue('hello world\nhello universe')
      vi.mocked(writeFile).mockResolvedValue(undefined)

      const result = await grepReplaceHandler({
        pattern: 'hello',
        replacement: 'hi',
        filePath: 'test.txt',
      })

      expect(readFile).toHaveBeenCalledWith(resolve('/test/cwd', 'test.txt'), 'utf-8')
      expect(writeFile).toHaveBeenCalledWith(resolve('/test/cwd', 'test.txt'), 'hi world\nhi universe', 'utf-8')
      expect(result.content?.[0]?.text).toContain('Replaced 2 occurrences in test.txt')
    })

    it('should handle no matches', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(readFile).mockResolvedValue('no matches here')

      const result = await grepReplaceHandler({
        pattern: 'nonexistent',
        replacement: 'replacement',
        filePath: 'test.txt',
      })

      expect(result.content?.[0]?.text).toContain('No matches found in test.txt')
      expect(writeFile).not.toHaveBeenCalled()
    })

    it('should reject paths outside working directory', async () => {
      vi.mocked(validatePath).mockReturnValue(false)

      const result = await grepReplaceHandler({
        pattern: 'test',
        replacement: 'replacement',
        filePath: '../outside.txt',
      })

      expect(result.content?.[0]?.text).toContain('File path is outside working directory')
    })

    it('should handle file read errors', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(readFile).mockRejectedValue(new Error('File not found'))

      const result = await grepReplaceHandler({
        pattern: 'test',
        replacement: 'replacement',
        filePath: 'nonexistent.txt',
      })

      expect(result.content?.[0]?.text).toContain('Error processing file: File not found')
    })
  })

  describe('openHandler', () => {
    it('should read file content', async () => {
      vi.mocked(readFile).mockResolvedValue('file content here')

      const result = await openHandler({ filePath: 'test.txt' })

      expect(readFile).toHaveBeenCalledWith(resolve('/test/cwd', 'test.txt'), 'utf-8')
      expect(result.content?.[0]?.text).toContain('Content of test.txt:\n\nfile content here')
      expect(result.content?.[0]?._meta).toBe(undefined)
    })

    it('should handle file read errors', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('Permission denied'))

      const result = await openHandler({ filePath: 'restricted.txt' })

      expect(result.content?.[0]?.text).toContain('Error reading file: Permission denied')
    })
  })

  describe('openMultipleHandler', () => {
    it('should read multiple files', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(readFile).mockResolvedValueOnce('content of file1').mockResolvedValueOnce('content of file2')

      const result = await openMultipleHandler({
        filePaths: ['file1.txt', 'file2.txt'],
      })

      expect(result.content?.[0]?.text).toContain('=== file1.txt ===')
      expect(result.content?.[0]?.text).toContain('content of file1')
      expect(result.content?.[0]?.text).toContain('=== file2.txt ===')
      expect(result.content?.[0]?.text).toContain('content of file2')
    })

    it('should limit to 5 files', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(readFile).mockResolvedValue('content')

      const filePaths = Array.from({ length: 10 }, (_, i) => `file${i}.txt`)
      await openMultipleHandler({ filePaths })

      expect(readFile).toHaveBeenCalledTimes(5)
    })

    it('should handle path validation errors', async () => {
      vi.mocked(validatePath).mockReturnValueOnce(true).mockReturnValueOnce(false)
      vi.mocked(readFile).mockResolvedValue('content')

      const result = await openMultipleHandler({
        filePaths: ['valid.txt', '../invalid.txt'],
      })

      expect(result.content?.[0]?.text).toContain('=== valid.txt ===')
      expect(result.content?.[0]?.text).toContain('content')
      expect(result.content?.[0]?.text).toContain('=== ../invalid.txt ===')
      expect(result.content?.[0]?.text).toContain('Path is outside working directory')
    })

    it('should handle file read errors', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(readFile).mockResolvedValueOnce('content').mockRejectedValueOnce(new Error('File not found'))

      const result = await openMultipleHandler({
        filePaths: ['exists.txt', 'missing.txt'],
      })

      expect(result.content?.[0]?.text).toContain('=== exists.txt ===')
      expect(result.content?.[0]?.text).toContain('content')
      expect(result.content?.[0]?.text).toContain('=== missing.txt ===')
      expect(result.content?.[0]?.text).toContain('Error: File not found')
    })
  })

  describe('writeHandler', () => {
    it('should write file successfully', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(writeFile).mockResolvedValue(undefined)

      const result = await writeHandler({
        filePath: 'dir/test.txt',
        content: 'test content',
      })

      expect(mkdir).toHaveBeenCalledWith(dirname(resolve('/test/cwd', 'dir/test.txt')), { recursive: true })
      expect(writeFile).toHaveBeenCalledWith(resolve('/test/cwd', 'dir/test.txt'), 'test content', 'utf-8')
      expect(result.content?.[0]?.text).toContain('Successfully wrote 12 characters to dir/test.txt')
      expect(result.content?.[0]?._meta).toBe(undefined)
    })

    it('should reject paths outside working directory', async () => {
      vi.mocked(validatePath).mockReturnValue(false)

      const result = await writeHandler({
        filePath: '../outside.txt',
        content: 'content',
      })

      expect(result.content?.[0]?.text).toContain('File path is outside working directory')
      expect(writeFile).not.toHaveBeenCalled()
    })

    it('should handle write errors', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(writeFile).mockRejectedValue(new Error('Disk full'))

      const result = await writeHandler({
        filePath: 'test.txt',
        content: 'content',
      })

      expect(result.content?.[0]?.text).toContain('Error writing file: Disk full')
    })

    it('should handle empty content', async () => {
      vi.mocked(validatePath).mockReturnValue(true)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(writeFile).mockResolvedValue(undefined)

      const result = await writeHandler({
        filePath: 'empty.txt',
        content: '',
      })

      expect(result.content?.[0]?.text).toContain('Successfully wrote 0 characters to empty.txt')
    })
  })
})
