import { readFile, stat } from 'fs/promises'
import { resolve, normalize } from 'path'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { validateMultipleInput, getFileStats, readFileContent, processFile, openFiles } from './helper.js'
import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'

import type { OpenToolParams } from './types.js'

// Mock individual functions
vi.mock('fs/promises', async (importOriginal) => ({
  ...(await importOriginal()),
  readFile: vi.fn(),
  stat: vi.fn(),
}))

vi.mock('path', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>
  return {
    ...original,
    resolve: vi.fn(),
    normalize: original.normalize,
  }
})

vi.mock('../lib/getWorkingDirectory.js', () => ({
  getWorkingDirectory: vi.fn(),
}))

const mockReadFile = vi.mocked(readFile)
const mockStat = vi.mocked(stat)
const mockResolve = vi.mocked(resolve)
const mockGetWorkingDirectory = vi.mocked(getWorkingDirectory)

const n = normalize

describe('validateMultipleInput', () => {
  it('should validate correct parameters', () => {
    const params: OpenToolParams = {
      filePaths: ['test1.txt', 'test2.txt'],
    }

    const result = validateMultipleInput(params)
    expect(result).toEqual(params)
  })

  it('should throw error for missing filePaths', () => {
    const params = {} as OpenToolParams

    expect(() => validateMultipleInput(params)).toThrow('filePaths is required and must be an array')
  })

  it('should throw error for non-array filePaths', () => {
    const params = {
      filePaths: 'not-an-array',
    } as unknown as OpenToolParams

    expect(() => validateMultipleInput(params)).toThrow('filePaths is required and must be an array')
  })

  it('should throw error for empty filePaths array', () => {
    const params: OpenToolParams = {
      filePaths: [],
    }

    expect(() => validateMultipleInput(params)).toThrow('At least one file path must be provided')
  })

  it('should throw error for too many files', () => {
    const params: OpenToolParams = {
      filePaths: ['1.txt', '2.txt', '3.txt', '4.txt', '5.txt', '6.txt'],
    }

    expect(() => validateMultipleInput(params)).toThrow('Maximum 5 files can be opened at once')
  })

  it('should throw error for non-string file paths', () => {
    const params = {
      filePaths: ['valid.txt', 123, 'another.txt'],
    } as unknown as OpenToolParams

    expect(() => validateMultipleInput(params)).toThrow('Each file path must be a non-empty string')
  })

  it('should throw error for empty string file paths', () => {
    const params: OpenToolParams = {
      filePaths: ['valid.txt', ' ', 'another.txt'],
    }

    expect(() => validateMultipleInput(params)).toThrow('File paths cannot be empty')
  })

  it('should allow maximum 5 files', () => {
    const params: OpenToolParams = {
      filePaths: ['1.txt', '2.txt', '3.txt', '4.txt', '5.txt'],
    }

    const result = validateMultipleInput(params)
    expect(result).toEqual(params)
  })
})

describe('getFileStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return true and size if file exists', async () => {
    mockStat.mockResolvedValue({ size: 100 } as never)

    const result = await getFileStats('/path/to/file.txt')
    expect(result).toEqual({ exists: true, size: 100 })
    expect(mockStat).toHaveBeenCalledWith('/path/to/file.txt')
  })

  it('should return false and size 0 if file does not exist', async () => {
    mockStat.mockRejectedValue(new Error('ENOENT'))

    const result = await getFileStats('/path/to/nonexistent.txt')
    expect(result).toEqual({ exists: false, size: 0 })
  })
})

describe('readFileContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return file content if file exists', async () => {
    mockReadFile.mockResolvedValue('file content' as never)

    const result = await readFileContent('/path/to/file.txt')
    expect(result).toBe('file content')
    expect(mockReadFile).toHaveBeenCalledWith('/path/to/file.txt', 'utf8')
  })

  it('should throw descriptive error for missing file', async () => {
    const enoentError = new Error('ENOENT: no such file or directory')
    mockReadFile.mockRejectedValue(enoentError)

    await expect(readFileContent('/path/to/nonexistent.txt')).rejects.toThrow(
      'File not found: /path/to/nonexistent.txt',
    )
  })

  it('should re-throw non-ENOENT errors', async () => {
    const permissionError = new Error('EACCES: permission denied')
    mockReadFile.mockRejectedValue(permissionError)

    await expect(readFileContent('/path/to/file.txt')).rejects.toThrow('EACCES: permission denied')
  })
})

describe('processFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    mockGetWorkingDirectory.mockReturnValue(n('/working/dir'))
    mockResolve.mockImplementation((...args: string[]) => {
      const lastArg = args[args.length - 1]
      return n(`/working/dir/${lastArg}`)
    })
  })

  it('should process existing file successfully', async () => {
    mockStat.mockResolvedValue({ size: 11 } as never)
    mockReadFile.mockResolvedValue('Hello world' as never)

    const result = await processFile('test.txt', n('/working/dir'))

    expect(result).toEqual({
      filePath: 'test.txt',
      content: 'Hello world',
      exists: true,
      size: 11,
    })
  })

  it('should process non-existing file', async () => {
    mockStat.mockRejectedValue(new Error('ENOENT'))

    const result = await processFile('nonexistent.txt', n('/working/dir'))

    expect(result).toEqual({
      filePath: 'nonexistent.txt',
      content: '',
      exists: false,
      size: 0,
    })

    expect(mockReadFile).not.toHaveBeenCalled()
  })

  it('should throw error for path outside working directory', async () => {
    // Mock isSubPath to return false by making relative path start with ..
    mockResolve.mockReturnValue(n('/outside/dir/file.txt'))

    await expect(processFile('../../../outside/file.txt', n('/working/dir'))).rejects.toThrow(
      "Access forbidden: File path '../../../outside/file.txt' is outside the working directory",
    )

    expect(mockStat).not.toHaveBeenCalled()
    expect(mockReadFile).not.toHaveBeenCalled()
  })

  it('should handle readFile errors for existing files', async () => {
    mockStat.mockResolvedValue({ size: 100 } as never)
    mockReadFile.mockRejectedValue(new Error('Permission denied'))

    await expect(processFile('protected.txt', n('/working/dir'))).rejects.toThrow('Permission denied')
  })

  it('should handle subdirectory paths', async () => {
    mockStat.mockResolvedValue({ size: 20 } as never)
    mockReadFile.mockResolvedValue('nested content' as never)

    const result = await processFile('subdir/nested.txt', n('/working/dir'))

    expect(result.filePath).toBe('subdir/nested.txt')
    expect(result.content).toBe('nested content')
    expect(result.exists).toBe(true)
    expect(result.size).toBe(20)
  })
})

describe('openFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    mockGetWorkingDirectory.mockReturnValue(n('/working/dir'))
    mockResolve.mockImplementation((...args: string[]) => {
      const lastArg = args[args.length - 1]
      return n(`/working/dir/${lastArg}`)
    })
  })

  it('should open single file successfully', async () => {
    const params = { filePaths: ['test.txt'] }

    mockStat.mockResolvedValue({ size: 11 } as never)
    mockReadFile.mockResolvedValue('Hello world' as never)

    const result = await openFiles(params)

    expect(result).toEqual({
      files: [
        {
          filePath: 'test.txt',
          content: 'Hello world',
          exists: true,
          size: 11,
        },
      ],
      totalFiles: 1,
    })
  })

  it('should open multiple files successfully', async () => {
    const params = { filePaths: ['file1.txt', 'file2.txt'] }

    mockStat.mockResolvedValueOnce({ size: 9 } as never).mockResolvedValueOnce({ size: 9 } as never)
    mockReadFile.mockResolvedValueOnce('Content 1' as never).mockResolvedValueOnce('Content 2' as never)

    const result = await openFiles(params)

    expect(result).toEqual({
      files: [
        {
          filePath: 'file1.txt',
          content: 'Content 1',
          exists: true,
          size: 9,
        },
        {
          filePath: 'file2.txt',
          content: 'Content 2',
          exists: true,
          size: 9,
        },
      ],
      totalFiles: 2,
    })
  })

  it('should handle mix of existing and non-existing files', async () => {
    const params = { filePaths: ['existing.txt', 'nonexistent.txt'] }

    mockStat.mockResolvedValueOnce({ size: 7 } as never).mockRejectedValueOnce(new Error('ENOENT'))
    mockReadFile.mockResolvedValueOnce('Exists!' as never)

    const result = await openFiles(params)

    expect(result).toEqual({
      files: [
        {
          filePath: 'existing.txt',
          content: 'Exists!',
          exists: true,
          size: 7,
        },
        {
          filePath: 'nonexistent.txt',
          content: '',
          exists: false,
          size: 0,
        },
      ],
      totalFiles: 2,
    })
  })

  it('should throw error if any file has path outside working directory', async () => {
    const params = { filePaths: ['valid.txt', '../../../outside.txt'] }

    // First file is valid
    mockStat.mockResolvedValueOnce({ size: 5 } as never)
    mockReadFile.mockResolvedValueOnce('Valid' as never)

    // Second file is outside working directory
    mockResolve.mockReturnValueOnce(n('/working/dir/valid.txt')).mockReturnValueOnce(n('/outside/dir/outside.txt'))

    await expect(openFiles(params)).rejects.toThrow(
      "Access forbidden: File path '../../../outside.txt' is outside the working directory",
    )
  })

  it('should handle empty files', async () => {
    const params = { filePaths: ['empty.txt'] }

    mockStat.mockResolvedValue({ size: 0 } as never)
    mockReadFile.mockResolvedValue('' as never)

    const result = await openFiles(params)

    expect(result.files[0]).toEqual({
      filePath: 'empty.txt',
      content: '',
      exists: true,
      size: 0,
    })
  })

  it('should handle unicode content correctly', async () => {
    const params = { filePaths: ['unicode.txt'] }
    const unicodeContent = '🚀 Hello 世界'

    mockStat.mockResolvedValue({ size: Buffer.byteLength(unicodeContent, 'utf8') } as never)
    mockReadFile.mockResolvedValue(unicodeContent as never)

    const result = await openFiles(params)

    expect(result.files[0].content).toBe(unicodeContent)
    expect(result.files[0].size).toBe(Buffer.byteLength(unicodeContent, 'utf8'))
  })
})
