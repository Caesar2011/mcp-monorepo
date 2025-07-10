import { writeFile, stat, mkdir } from 'fs/promises'
import { resolve, normalize, dirname } from 'path'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { validateInput, checkFileExists, ensureDirectoryExists, writeFileContent } from './helper.js'
import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'

import type { WriteToolParams } from './types.js'

// Mock individual functions
vi.mock('fs/promises', async (importOriginal) => ({
  ...(await importOriginal()),
  writeFile: vi.fn(),
  stat: vi.fn(),
  mkdir: vi.fn(),
}))

vi.mock('path', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>
  return {
    ...original,
    resolve: vi.fn(),
    dirname: vi.fn(),
    normalize: original.normalize,
  }
})

vi.mock('../lib/getWorkingDirectory.js', () => ({
  getWorkingDirectory: vi.fn(),
}))

const mockWriteFile = vi.mocked(writeFile)
const mockStat = vi.mocked(stat)
const mockMkdir = vi.mocked(mkdir)
const mockResolve = vi.mocked(resolve)
const mockDirname = vi.mocked(dirname)
const mockGetWorkingDirectory = vi.mocked(getWorkingDirectory)

const n = normalize

describe('validateInput', () => {
  it('should validate correct parameters', () => {
    const params: WriteToolParams = {
      filePath: 'test.txt',
      content: 'Hello world',
    }

    const result = validateInput(params)
    expect(result).toEqual(params)
  })

  it('should throw error for missing filePath', () => {
    const params = {
      content: 'Hello world',
    } as WriteToolParams

    expect(() => validateInput(params)).toThrow('filePath is required and must be a string')
  })

  it('should throw error for empty filePath', () => {
    const params: WriteToolParams = {
      filePath: ' ',
      content: 'Hello world',
    }

    expect(() => validateInput(params)).toThrow('filePath cannot be empty')
  })

  it('should throw error for non-string filePath', () => {
    const params = {
      filePath: 123,
      content: 'Hello world',
    } as unknown as WriteToolParams

    expect(() => validateInput(params)).toThrow('filePath is required and must be a string')
  })

  it('should throw error for non-string content', () => {
    const params = {
      filePath: 'test.txt',
      content: 123,
    } as unknown as WriteToolParams

    expect(() => validateInput(params)).toThrow('content must be a string')
  })

  it('should allow empty content string', () => {
    const params: WriteToolParams = {
      filePath: 'test.txt',
      content: '',
    }

    const result = validateInput(params)
    expect(result).toEqual(params)
  })
})

describe('checkFileExists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return true if file exists', async () => {
    mockStat.mockResolvedValue({} as never)

    const result = await checkFileExists('/path/to/file.txt')
    expect(result).toBe(true)
    expect(mockStat).toHaveBeenCalledWith('/path/to/file.txt')
  })

  it('should return false if file does not exist', async () => {
    mockStat.mockRejectedValue(new Error('ENOENT'))

    const result = await checkFileExists('/path/to/nonexistent.txt')
    expect(result).toBe(false)
  })
})

describe('ensureDirectoryExists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create directory if it does not exist', async () => {
    mockDirname.mockReturnValue('/path/to')
    mockMkdir.mockResolvedValue(undefined as never)

    await ensureDirectoryExists('/path/to/file.txt')

    expect(mockDirname).toHaveBeenCalledWith('/path/to/file.txt')
    expect(mockMkdir).toHaveBeenCalledWith('/path/to', { recursive: true })
  })

  it('should handle existing directory gracefully', async () => {
    mockDirname.mockReturnValue('/path/to')
    const existsError = new Error('EEXIST: file already exists')
    mockMkdir.mockRejectedValue(existsError)

    await expect(ensureDirectoryExists('/path/to/file.txt')).resolves.not.toThrow()
  })

  it('should throw non-EEXIST errors', async () => {
    mockDirname.mockReturnValue('/path/to')
    const permissionError = new Error('EACCES: permission denied')
    mockMkdir.mockRejectedValue(permissionError)

    await expect(ensureDirectoryExists('/path/to/file.txt')).rejects.toThrow('EACCES: permission denied')
  })
})

describe('writeFileContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    mockGetWorkingDirectory.mockReturnValue(n('/working/dir'))
    mockResolve.mockImplementation((...args: string[]) => {
      const lastArg = args[args.length - 1]
      return n(`/working/dir/${lastArg}`)
    })
    mockDirname.mockImplementation((path: string) => {
      const parts = path.split('/')
      parts.pop()
      return parts.join('/')
    })
  })

  it('should write file successfully when creating new file', async () => {
    const params = {
      filePath: 'test.txt',
      content: 'Hello world',
    }

    mockStat.mockRejectedValue(new Error('ENOENT')) // File doesn't exist
    mockMkdir.mockResolvedValue(undefined as never)
    mockWriteFile.mockResolvedValue(undefined as never)

    const result = await writeFileContent(params)

    expect(result).toEqual({
      filePath: n('/working/dir/test.txt'),
      bytesWritten: 11, // "Hello world" is 11 bytes
      created: true,
    })

    expect(mockWriteFile).toHaveBeenCalledWith(n('/working/dir/test.txt'), 'Hello world', 'utf8')
  })

  it('should write file successfully when overwriting existing file', async () => {
    const params = {
      filePath: 'existing.txt',
      content: 'New content',
    }

    mockStat.mockResolvedValue({} as never) // File exists
    mockMkdir.mockResolvedValue(undefined as never)
    mockWriteFile.mockResolvedValue(undefined as never)

    const result = await writeFileContent(params)

    expect(result).toEqual({
      filePath: n('/working/dir/existing.txt'),
      bytesWritten: 11, // "New content" is 11 bytes
      created: false,
    })
  })

  it('should handle empty content', async () => {
    const params = {
      filePath: 'empty.txt',
      content: '',
    }

    mockStat.mockRejectedValue(new Error('ENOENT'))
    mockMkdir.mockResolvedValue(undefined as never)
    mockWriteFile.mockResolvedValue(undefined as never)

    const result = await writeFileContent(params)

    expect(result).toEqual({
      filePath: n('/working/dir/empty.txt'),
      bytesWritten: 0,
      created: true,
    })
  })

  it('should handle unicode content correctly', async () => {
    const params = {
      filePath: 'unicode.txt',
      content: '🚀 Hello 世界',
    }

    mockStat.mockRejectedValue(new Error('ENOENT'))
    mockMkdir.mockResolvedValue(undefined as never)
    mockWriteFile.mockResolvedValue(undefined as never)

    const result = await writeFileContent(params)

    expect(result.bytesWritten).toBe(Buffer.byteLength('🚀 Hello 世界', 'utf8'))
  })

  it('should throw error for path outside working directory', async () => {
    // Mock isSubPath to return false by making relative path start with ..
    mockResolve.mockReturnValue(n('/outside/dir/file.txt'))

    const params = {
      filePath: '../../../outside/file.txt',
      content: 'content',
    }

    await expect(writeFileContent(params)).rejects.toThrow('Access forbidden: File path outside the working directory.')

    expect(mockWriteFile).not.toHaveBeenCalled()
  })

  it('should handle subdirectory paths', async () => {
    const params = {
      filePath: 'subdir/nested/test.txt',
      content: 'nested content',
    }

    mockStat.mockRejectedValue(new Error('ENOENT'))
    mockMkdir.mockResolvedValue(undefined as never)
    mockWriteFile.mockResolvedValue(undefined as never)

    const result = await writeFileContent(params)

    expect(result.filePath).toBe(n('/working/dir/subdir/nested/test.txt'))
    expect(mockMkdir).toHaveBeenCalled()
  })

  it('should handle writeFile errors', async () => {
    const params = {
      filePath: 'test.txt',
      content: 'content',
    }

    mockStat.mockRejectedValue(new Error('ENOENT'))
    mockMkdir.mockResolvedValue(undefined as never)
    mockWriteFile.mockRejectedValue(new Error('Permission denied'))

    await expect(writeFileContent(params)).rejects.toThrow('Permission denied')
  })

  it('should handle mkdir errors (non-EEXIST)', async () => {
    const params = {
      filePath: 'test.txt',
      content: 'content',
    }

    mockStat.mockRejectedValue(new Error('ENOENT'))
    mockMkdir.mockRejectedValue(new Error('EACCES: permission denied'))

    await expect(writeFileContent(params)).rejects.toThrow('EACCES: permission denied')
  })
})
