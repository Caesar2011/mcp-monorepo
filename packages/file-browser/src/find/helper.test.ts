import { describe, it, expect, vi, beforeEach } from 'vitest'

import { validateInput, findFiles } from './helper.js'
import { collectMatches } from '../lib/traversal.js'

import type { FindToolParams } from './types.js'
import type { TraversalMatch } from '../lib/traversal.js'

// Mock the shared traversal module
vi.mock('../lib/traversal.js', () => ({
  collectMatches: vi.fn(),
}))

const mockCollectMatches = vi.mocked(collectMatches)

describe('validateInput', () => {
  it('should validate correct parameters', () => {
    const params: FindToolParams = { pattern: 'test.*\\.txt$' }
    const result = validateInput(params)
    expect(result).toEqual(params)
  })

  it('should throw error for missing pattern', () => {
    const params = {} as FindToolParams
    expect(() => validateInput(params)).toThrow('pattern is required and must be a string')
  })

  it('should throw error for non-string pattern', () => {
    const params = { pattern: 123 } as unknown as FindToolParams
    expect(() => validateInput(params)).toThrow('pattern is required and must be a string')
  })

  it('should throw error for empty pattern', () => {
    const params: FindToolParams = { pattern: ' ' }
    expect(() => validateInput(params)).toThrow('pattern cannot be empty')
  })

  it('should throw error for invalid regex', () => {
    const params: FindToolParams = { pattern: '[invalid' }
    expect(() => validateInput(params)).toThrow('Invalid regex pattern:')
  })

  it('should validate complex regex patterns', () => {
    const params: FindToolParams = { pattern: '^(src|lib)/.*\\.(ts|js)$' }
    const result = validateInput(params)
    expect(result).toEqual(params)
  })

  it('should validate special regex characters', () => {
    const params: FindToolParams = { pattern: '\\w+\\.(test|spec)\\.(js|ts)$' }
    const result = validateInput(params)
    expect(result).toEqual(params)
  })
})

describe('findFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should find and convert matching files', async () => {
    const params = { pattern: '\\.txt$' }

    const traversalMatches: TraversalMatch[] = [
      {
        path: 'file1.txt',
        fullPath: '/working/file1.txt',
        size: 1024,
        isDirectory: false,
      },
      {
        path: 'file2.txt',
        fullPath: '/working/file2.txt',
        size: 512,
        isDirectory: false,
      },
    ]

    mockCollectMatches.mockResolvedValue(traversalMatches)

    const result = await findFiles(params)

    expect(mockCollectMatches).toHaveBeenCalledWith(expect.any(RegExp))
    expect(result.totalMatches).toBe(2)
    expect(result.matches).toHaveLength(2)
    expect(result.matches[0]).toEqual({
      path: 'file1.txt',
      size: 1024,
      isDirectory: false,
    })
    expect(result.matches[1]).toEqual({
      path: 'file2.txt',
      size: 512,
      isDirectory: false,
    })
  })

  it('should handle directories in results', async () => {
    const params = { pattern: 'src' }

    const traversalMatches: TraversalMatch[] = [
      {
        path: 'src',
        fullPath: '/working/src',
        size: 4096,
        isDirectory: true,
      },
      {
        path: 'src/index.ts',
        fullPath: '/working/src/index.ts',
        size: 2048,
        isDirectory: false,
      },
    ]

    mockCollectMatches.mockResolvedValue(traversalMatches)

    const result = await findFiles(params)

    expect(result.totalMatches).toBe(2)
    expect(result.matches[0].isDirectory).toBe(true)
    expect(result.matches[1].isDirectory).toBe(false)
  })

  it('should return empty result when no matches', async () => {
    const params = { pattern: '\\.nonexistent$' }

    mockCollectMatches.mockResolvedValue([])

    const result = await findFiles(params)

    expect(result.totalMatches).toBe(0)
    expect(result.matches).toHaveLength(0)
  })

  it('should handle files with zero size', async () => {
    const params = { pattern: 'empty' }

    const traversalMatches: TraversalMatch[] = [
      {
        path: 'empty.txt',
        fullPath: '/working/empty.txt',
        size: 0,
        isDirectory: false,
      },
    ]

    mockCollectMatches.mockResolvedValue(traversalMatches)

    const result = await findFiles(params)

    expect(result.matches[0].size).toBe(0)
  })

  it('should handle large file sizes', async () => {
    const params = { pattern: 'large' }

    const traversalMatches: TraversalMatch[] = [
      {
        path: 'large-file.bin',
        fullPath: '/working/large-file.bin',
        size: 9007199254740991, // Max safe integer
        isDirectory: false,
      },
    ]

    mockCollectMatches.mockResolvedValue(traversalMatches)

    const result = await findFiles(params)

    expect(result.matches[0].size).toBe(9007199254740991)
  })

  it('should handle paths with special characters', async () => {
    const params = { pattern: 'unicode' }

    const traversalMatches: TraversalMatch[] = [
      {
        path: 'files with spaces/test-file_v2.txt',
        fullPath: '/working/files with spaces/test-file_v2.txt',
        size: 256,
        isDirectory: false,
      },
      {
        path: 'unicode-测试文件.txt',
        fullPath: '/working/unicode-测试文件.txt',
        size: 128,
        isDirectory: false,
      },
    ]

    mockCollectMatches.mockResolvedValue(traversalMatches)

    const result = await findFiles(params)

    expect(result.matches[0].path).toBe('files with spaces/test-file_v2.txt')
    expect(result.matches[1].path).toBe('unicode-测试文件.txt')
  })

  it('should compile regex pattern correctly', async () => {
    const params = { pattern: '^src/.*\\.(ts|js)$' }

    mockCollectMatches.mockResolvedValue([])

    await findFiles(params)

    // Verify the regex was created and passed correctly
    expect(mockCollectMatches).toHaveBeenCalledWith(expect.any(RegExp))
    const passedRegex = mockCollectMatches.mock.calls[0][0] as RegExp
    expect(passedRegex.source).toBe('^src\\/.*\\.(ts|js)$')
  })

  it('should handle traversal errors from shared library', async () => {
    const params = { pattern: 'test' }

    const traversalError = new Error('Permission denied')
    mockCollectMatches.mockRejectedValue(traversalError)

    await expect(findFiles(params)).rejects.toThrow('Permission denied')
  })

  it('should preserve order of results from traversal', async () => {
    const params = { pattern: '.*' }

    // collectMatches returns sorted results
    const traversalMatches: TraversalMatch[] = [
      {
        path: 'a.txt',
        fullPath: '/working/a.txt',
        size: 100,
        isDirectory: false,
      },
      {
        path: 'b.txt',
        fullPath: '/working/b.txt',
        size: 200,
        isDirectory: false,
      },
      {
        path: 'c.txt',
        fullPath: '/working/c.txt',
        size: 300,
        isDirectory: false,
      },
    ]

    mockCollectMatches.mockResolvedValue(traversalMatches)

    const result = await findFiles(params)

    expect(result.matches).toHaveLength(3)
    expect(result.matches[0].path).toBe('a.txt')
    expect(result.matches[1].path).toBe('b.txt')
    expect(result.matches[2].path).toBe('c.txt')
  })
})
