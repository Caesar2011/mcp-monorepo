import { readFile, writeFile } from 'fs/promises'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { validateInput, replaceFileContent, grepReplaceFiles } from './helper.js'
import { traverseWithCallback } from '../lib/traversal.js'

import type { GrepReplaceToolParams, ValidatedGrepReplaceParams } from './types.js'

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

// Mock traversal
vi.mock('../lib/traversal.js', () => ({
  traverseWithCallback: vi.fn(),
}))

const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)
const mockTraverseWithCallback = vi.mocked(traverseWithCallback)

describe('validateInput', () => {
  it('should validate correct input parameters', () => {
    const params: GrepReplaceToolParams = {
      pathPattern: '\\.js$',
      contentPattern: 'console\\.log',
      replacement: 'logger.info',
    }

    const result = validateInput(params)
    expect(result).toEqual(params)
  })

  it('should throw error for missing pathPattern', () => {
    const params = {
      contentPattern: 'test',
      replacement: 'replacement',
    } as GrepReplaceToolParams

    expect(() => validateInput(params)).toThrow('pathPattern is required and must be a string')
  })

  it('should throw error for missing contentPattern', () => {
    const params = {
      pathPattern: 'test',
      replacement: 'replacement',
    } as GrepReplaceToolParams

    expect(() => validateInput(params)).toThrow('contentPattern is required and must be a string')
  })

  it('should throw error for missing replacement', () => {
    const params = {
      pathPattern: 'test',
      contentPattern: 'test',
    } as GrepReplaceToolParams

    expect(() => validateInput(params)).toThrow('replacement is required and must be a string')
  })

  it('should throw error for empty pathPattern', () => {
    const params: GrepReplaceToolParams = {
      pathPattern: '',
      contentPattern: 'test',
      replacement: 'replacement',
    }

    expect(() => validateInput(params)).toThrow('pathPattern is required and must be a string')
  })

  it('should throw error for empty contentPattern', () => {
    const params: GrepReplaceToolParams = {
      pathPattern: 'test',
      contentPattern: '',
      replacement: 'replacement',
    }

    expect(() => validateInput(params)).toThrow('contentPattern is required and must be a string')
  })

  it('should throw error for invalid pathPattern regex', () => {
    const params: GrepReplaceToolParams = {
      pathPattern: '[invalid',
      contentPattern: 'test',
      replacement: 'replacement',
    }

    expect(() => validateInput(params)).toThrow('Invalid pathPattern regex:')
  })

  it('should throw error for invalid contentPattern regex', () => {
    const params: GrepReplaceToolParams = {
      pathPattern: 'test',
      contentPattern: '[invalid',
      replacement: 'replacement',
    }

    expect(() => validateInput(params)).toThrow('Invalid contentPattern regex:')
  })

  it('should allow empty replacement string', () => {
    const params: GrepReplaceToolParams = {
      pathPattern: 'test',
      contentPattern: 'test',
      replacement: '',
    }

    const result = validateInput(params)
    expect(result).toEqual(params)
  })
})

describe('replaceFileContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should replace content and return match result', async () => {
    const filePath = '/test/file.js'
    const relativePath = 'file.js'
    const contentPattern = /console\.log/g
    const replacement = 'logger.info'
    const originalContent = 'console.log("test");\nconsole.log("another");'
    const expectedContent = 'logger.info("test");\nlogger.info("another");'

    mockReadFile.mockResolvedValue(originalContent)
    mockWriteFile.mockResolvedValue()

    const result = await replaceFileContent(filePath, relativePath, contentPattern, replacement)

    expect(mockReadFile).toHaveBeenCalledWith(filePath, 'utf-8')
    expect(mockWriteFile).toHaveBeenCalledWith(filePath, expectedContent, 'utf-8')
    expect(result).toEqual({
      file: relativePath,
      replacementCount: 2,
    })
  })

  it('should return null when no matches found', async () => {
    const filePath = '/test/file.js'
    const relativePath = 'file.js'
    const contentPattern = /nonexistent/g
    const replacement = 'replacement'
    const originalContent = 'some content without matches'

    mockReadFile.mockResolvedValue(originalContent)

    const result = await replaceFileContent(filePath, relativePath, contentPattern, replacement)

    expect(mockReadFile).toHaveBeenCalledWith(filePath, 'utf-8')
    expect(mockWriteFile).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })

  it('should handle regex groups in replacement', async () => {
    const filePath = '/test/file.js'
    const relativePath = 'file.js'
    const contentPattern = /console\.(log|error)/g
    const replacement = 'logger.$1'
    const originalContent = 'console.log("test");\nconsole.error("error");'
    const expectedContent = 'logger.log("test");\nlogger.error("error");'

    mockReadFile.mockResolvedValue(originalContent)
    mockWriteFile.mockResolvedValue()

    const result = await replaceFileContent(filePath, relativePath, contentPattern, replacement)

    expect(mockWriteFile).toHaveBeenCalledWith(filePath, expectedContent, 'utf-8')
    expect(result).toEqual({
      file: relativePath,
      replacementCount: 2,
    })
  })

  it('should return null on file read error', async () => {
    const filePath = '/test/file.js'
    const relativePath = 'file.js'
    const contentPattern = /test/g
    const replacement = 'TEST'

    mockReadFile.mockRejectedValue(new Error('Permission denied'))

    const result = await replaceFileContent(filePath, relativePath, contentPattern, replacement)

    expect(result).toBeUndefined()
  })
})

describe('grepReplaceFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should process multiple files and return results', async () => {
    const params: ValidatedGrepReplaceParams = {
      pathPattern: '\\.js$',
      contentPattern: 'console\\.log',
      replacement: 'logger.info',
    }

    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.includes('index.js')) {
        return 'console.log("test");\nconsole.log("another");'
      }
      if (filePath.includes('helper.js')) {
        return 'console.log("helper");'
      }
      return ''
    })
    mockWriteFile.mockResolvedValue()

    mockTraverseWithCallback.mockImplementation(async ({ callback }) => {
      await callback({
        path: 'src/index.js',
        fullPath: '/project/src/index.js',
        isDirectory: false,
        size: 1000,
      })
      await callback({
        path: 'src/helper.js',
        fullPath: '/project/src/helper.js',
        isDirectory: false,
        size: 500,
      })
      return 2
    })

    const result = await grepReplaceFiles(params)

    expect(result).toEqual({
      matches: [
        {
          file: 'src/index.js',
          replacementCount: 2,
        },
        {
          file: 'src/helper.js',
          replacementCount: 1,
        },
      ],
      totalReplacements: 3,
      filesModified: ['src/helper.js', 'src/index.js'],
    })
  })

  it('should handle no matches found', async () => {
    const params: ValidatedGrepReplaceParams = {
      pathPattern: '\\.nonexistent$',
      contentPattern: 'nomatch',
      replacement: 'replacement',
    }

    mockTraverseWithCallback.mockImplementation(async () => 0)

    const result = await grepReplaceFiles(params)

    expect(result).toEqual({
      matches: [],
      totalReplacements: 0,
      filesModified: [],
    })
  })

  it('should only process files, not directories', async () => {
    const params: ValidatedGrepReplaceParams = {
      pathPattern: 'src',
      contentPattern: 'test',
      replacement: 'TEST',
    }

    mockReadFile.mockResolvedValue('test content')
    mockWriteFile.mockResolvedValue()

    mockTraverseWithCallback.mockImplementation(async ({ callback }) => {
      await callback({
        path: 'src',
        fullPath: '/project/src',
        isDirectory: true,
        size: 0,
      })
      await callback({
        path: 'src/file.js',
        fullPath: '/project/src/file.js',
        isDirectory: false,
        size: 100,
      })
      return 2
    })

    const result = await grepReplaceFiles(params)

    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].file).toBe('src/file.js')
    expect(mockReadFile).toHaveBeenCalledTimes(1)
  })
})
