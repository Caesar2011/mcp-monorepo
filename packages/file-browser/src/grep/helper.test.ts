import { readFile } from 'fs/promises'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { validateInput, searchFileContent, grepFiles } from './helper.js'
import { traverseWithCallback } from '../lib/traversal.js'

import type { GrepToolParams } from './types.js'
import type { TraversalMatch } from '../lib/traversal.js'

// Mock modules
vi.mock('fs/promises', async (importOriginal) => ({
  ...(await importOriginal()),
  readFile: vi.fn(),
}))

vi.mock('../lib/traversal.js', () => ({
  traverseWithCallback: vi.fn(),
}))

const mockReadFile = vi.mocked(readFile)
const mockTraverseWithCallback = vi.mocked(traverseWithCallback)

describe('validateInput', () => {
  it('should validate correct parameters', () => {
    const params: GrepToolParams = {
      pathPattern: '.*\\.ts$',
      contentPattern: 'function.*test',
    }
    const result = validateInput(params)
    expect(result).toEqual(params)
  })

  it('should throw error for missing pathPattern', () => {
    const params = { contentPattern: 'test' } as GrepToolParams
    expect(() => validateInput(params)).toThrow('pathPattern is required and must be a string')
  })

  it('should throw error for missing contentPattern', () => {
    const params = { pathPattern: '*.ts' } as GrepToolParams
    expect(() => validateInput(params)).toThrow('contentPattern is required and must be a string')
  })

  it('should throw error for non-string pathPattern', () => {
    const params = { pathPattern: 123, contentPattern: 'test' } as unknown as GrepToolParams
    expect(() => validateInput(params)).toThrow('pathPattern is required and must be a string')
  })

  it('should throw error for non-string contentPattern', () => {
    const params = { pathPattern: '*.ts', contentPattern: 123 } as unknown as GrepToolParams
    expect(() => validateInput(params)).toThrow('contentPattern is required and must be a string')
  })

  it('should throw error for empty pathPattern', () => {
    const params: GrepToolParams = { pathPattern: ' ', contentPattern: 'test' }
    expect(() => validateInput(params)).toThrow('pathPattern cannot be empty')
  })

  it('should throw error for empty contentPattern', () => {
    const params: GrepToolParams = { pathPattern: '*.ts', contentPattern: ' ' }
    expect(() => validateInput(params)).toThrow('contentPattern cannot be empty')
  })

  it('should throw error for invalid pathPattern regex', () => {
    const params: GrepToolParams = { pathPattern: '[invalid', contentPattern: 'test' }
    expect(() => validateInput(params)).toThrow('Invalid pathPattern regex:')
  })

  it('should throw error for invalid contentPattern regex', () => {
    const params: GrepToolParams = { pathPattern: '\\.ts', contentPattern: '[invalid' }
    expect(() => validateInput(params)).toThrow('Invalid contentPattern regex:')
  })

  it('should validate complex regex patterns', () => {
    const params: GrepToolParams = {
      pathPattern: '^(src|lib)/.*\\.(ts|js)$',
      contentPattern: 'export\\s+(const|function|class)\\s+\\w+',
    }
    const result = validateInput(params)
    expect(result).toEqual(params)
  })
})

describe('searchFileContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should find matches with context', async () => {
    const fileContent = 'line1\nline2\nfunction test() {\nline4\nline5\nline6'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('function')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      file: 'file.js',
      line: 3,
      match: 'function test() {',
      before: ['line1', 'line2'],
      after: ['line4', 'line5'],
    })
  })

  it('should handle matches at the beginning of file', async () => {
    const fileContent = 'function start() {\nline2\nline3'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('function')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result).toHaveLength(1)
    expect(result[0].before).toEqual([])
    expect(result[0].after).toEqual(['line2', 'line3'])
  })

  it('should handle matches at the end of file', async () => {
    const fileContent = 'line1\nline2\nfunction end() {'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('function')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result).toHaveLength(1)
    expect(result[0].before).toEqual(['line1', 'line2'])
    expect(result[0].after).toEqual([])
  })

  it('should handle multiple matches in the same file', async () => {
    const fileContent = 'function first() {\nline2\nfunction second() {\nline4'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('function', 'g')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result).toHaveLength(2)
    expect(result[0].line).toBe(1)
    expect(result[1].line).toBe(3)
  })

  it('should return empty array for files with no matches', async () => {
    const fileContent = 'line1\nline2\nline3'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('nomatch')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result).toHaveLength(0)
  })

  it('should handle file read errors gracefully', async () => {
    mockReadFile.mockRejectedValue(new Error('EACCES: permission denied'))

    const pattern = new RegExp('test')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result).toHaveLength(0)
  })

  it('should limit context to 2 lines before and after', async () => {
    const fileContent = 'line1\nline2\nline3\nline4\nfunction test() {\nline6\nline7\nline8\nline9'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('function')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result[0].before).toEqual(['line3', 'line4'])
    expect(result[0].after).toEqual(['line6', 'line7'])
  })

  it('should handle empty lines in context', async () => {
    const fileContent = '\nline2\nfunction test() {\n\nline5'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('function')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result[0].before).toEqual(['', 'line2'])
    expect(result[0].after).toEqual(['', 'line5'])
  })

  it('should handle unicode content', async () => {
    const fileContent = 'const 测试 = "test"\nconsole.log(测试)'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('测试')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result).toHaveLength(2)
    expect(result[0].match).toBe('const 测试 = "test"')
    expect(result[1].match).toBe('console.log(测试)')
  })
})

describe('grepFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should find and return grep results', async () => {
    const params = { pathPattern: '\\.js$', contentPattern: 'function' }

    // Mock traversal to call our callback with file matches
    mockTraverseWithCallback.mockImplementation(async (options) => {
      const fileMatch: TraversalMatch = {
        path: 'test.js',
        fullPath: '/working/test.js',
        size: 100,
        isDirectory: false,
      }

      // Call the callback
      await options.callback(fileMatch)
      return 1
    })

    // Mock file content
    mockReadFile.mockResolvedValue('function test() {\nreturn true\n}')

    const result = await grepFiles(params)

    expect(result.totalMatches).toBe(1)
    expect(result.matches).toHaveLength(1)
    expect(result.limited).toBe(false)
    expect(result.matches[0].file).toBe('test.js')
    expect(result.matches[0].match).toBe('function test() {')
  })

  it('should skip directories', async () => {
    const params = { pathPattern: '.*', contentPattern: 'test' }

    mockTraverseWithCallback.mockImplementation(async (options) => {
      // Directory match - should be skipped
      const dirMatch: TraversalMatch = {
        path: 'src',
        fullPath: '/working/src',
        size: 4096,
        isDirectory: true,
      }

      await options.callback(dirMatch)
      return 1
    })

    const result = await grepFiles(params)

    expect(result.totalMatches).toBe(0)
    expect(result.matches).toHaveLength(0)
    expect(mockReadFile).not.toHaveBeenCalled()
  })

  it('should return empty result when no matches', async () => {
    const params = { pathPattern: '\\.nonexistent$', contentPattern: 'test' }

    mockTraverseWithCallback.mockImplementation(async () => 0)

    const result = await grepFiles(params)

    expect(result.totalMatches).toBe(0)
    expect(result.matches).toHaveLength(0)
    expect(result.limited).toBe(false)
  })

  it('should limit results to 30 matches', async () => {
    const params = { pathPattern: '\\.js$', contentPattern: 'line' }

    // Create many matches by calling callback multiple times
    mockTraverseWithCallback.mockImplementation(async (options) => {
      for (let i = 0; i < 10; i++) {
        const fileMatch: TraversalMatch = {
          path: `file${i}.js`,
          fullPath: `/working/file${i}.js`,
          size: 100,
          isDirectory: false,
        }

        const shouldContinue = await options.callback(fileMatch)
        if (shouldContinue === false) break
      }
      return 10
    })

    // Mock file content with many matches (5 per file)
    const manyLines = new Array(5).fill('line with match').join('\n')
    mockReadFile.mockResolvedValue(manyLines)

    const result = await grepFiles(params)

    expect(result.totalMatches).toBe(30)
    expect(result.limited).toBe(true)
  })

  it('should handle file read errors during traversal', async () => {
    const params = { pathPattern: '\\.js$', contentPattern: 'function' }

    mockTraverseWithCallback.mockImplementation(async (options) => {
      const fileMatch: TraversalMatch = {
        path: 'error.js',
        fullPath: '/working/error.js',
        size: 100,
        isDirectory: false,
      }

      await options.callback(fileMatch)
      return 1
    })

    // Mock file read error
    mockReadFile.mockRejectedValue(new Error('EACCES: permission denied'))

    const result = await grepFiles(params)

    expect(result.totalMatches).toBe(0)
    expect(result.matches).toHaveLength(0)
  })

  it('should pass correct options to traverseWithCallback', async () => {
    const params = { pathPattern: '\\.ts$', contentPattern: 'export' }

    mockTraverseWithCallback.mockResolvedValue(0)

    await grepFiles(params)

    expect(mockTraverseWithCallback).toHaveBeenCalledWith({
      pathPattern: expect.any(RegExp),
      maxResults: 30,
      callback: expect.any(Function),
    })

    const options = mockTraverseWithCallback.mock.calls[0][0]
    expect(options.pathPattern.source).toBe('\\.ts$')
    expect(options.maxResults).toBe(30)
  })

  it('should stop traversal when 30 matches reached', async () => {
    const params = { pathPattern: '\\.js$', contentPattern: 'test' }

    let callbackCallCount = 0
    mockTraverseWithCallback.mockImplementation(async (options) => {
      // Simulate many file matches
      for (let i = 0; i < 50; i++) {
        const fileMatch: TraversalMatch = {
          path: `file${i}.js`,
          fullPath: `/working/file${i}.js`,
          size: 100,
          isDirectory: false,
        }

        callbackCallCount++
        const shouldContinue = await options.callback(fileMatch)
        if (shouldContinue === false) break
      }
      return callbackCallCount
    })

    // Each file has 1 match
    mockReadFile.mockResolvedValue('test line')

    const result = await grepFiles(params)

    expect(result.totalMatches).toBe(30)
    expect(result.limited).toBe(true)
    // Should stop early due to callback returning false
    expect(callbackCallCount).toBeLessThan(50)
  })

  it('should handle multiple matches per file correctly', async () => {
    const params = { pathPattern: '\\.js$', contentPattern: 'var' }

    mockTraverseWithCallback.mockImplementation(async (options) => {
      const fileMatch: TraversalMatch = {
        path: 'vars.js',
        fullPath: '/working/vars.js',
        size: 100,
        isDirectory: false,
      }

      await options.callback(fileMatch)
      return 1
    })

    // File with multiple var declarations
    const fileContent = 'var a = 1\nvar b = 2\nvar c = 3'
    mockReadFile.mockResolvedValue(fileContent)

    const result = await grepFiles(params)

    expect(result.totalMatches).toBe(3)
    expect(result.matches).toHaveLength(3)
    expect(result.matches[0].line).toBe(1)
    expect(result.matches[1].line).toBe(2)
    expect(result.matches[2].line).toBe(3)
  })

  it('should handle traversal errors from shared library', async () => {
    const params = { pathPattern: 'test', contentPattern: 'function' }

    const traversalError = new Error('Permission denied')
    mockTraverseWithCallback.mockRejectedValue(traversalError)

    await expect(grepFiles(params)).rejects.toThrow('Permission denied')
  })

  it('should validate complex regex patterns', () => {
    const params: GrepToolParams = {
      pathPattern: '^(src|lib)/.*\\.(ts|js)$',
      contentPattern: 'export\\s+(const|function|class)\\s+\\w+',
    }
    const result = validateInput(params)
    expect(result).toEqual(params)
  })
})

describe('searchFileContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should find matches with context', async () => {
    const fileContent = 'line1\nline2\nfunction test() {\nline4\nline5\nline6'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('function')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      file: 'file.js',
      line: 3,
      match: 'function test() {',
      before: ['line1', 'line2'],
      after: ['line4', 'line5'],
    })
  })

  it('should handle matches at the beginning of file', async () => {
    const fileContent = 'function start() {\nline2\nline3'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('function')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result).toHaveLength(1)
    expect(result[0].before).toEqual([])
    expect(result[0].after).toEqual(['line2', 'line3'])
  })

  it('should handle matches at the end of file', async () => {
    const fileContent = 'line1\nline2\nfunction end() {'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('function')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result).toHaveLength(1)
    expect(result[0].before).toEqual(['line1', 'line2'])
    expect(result[0].after).toEqual([])
  })

  it('should handle multiple matches in the same file', async () => {
    const fileContent = 'function first() {\nline2\nfunction second() {\nline4'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('function', 'g')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result).toHaveLength(2)
    expect(result[0].line).toBe(1)
    expect(result[1].line).toBe(3)
  })

  it('should return empty array for files with no matches', async () => {
    const fileContent = 'line1\nline2\nline3'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('nomatch')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result).toHaveLength(0)
  })

  it('should handle file read errors gracefully', async () => {
    mockReadFile.mockRejectedValue(new Error('EACCES: permission denied'))

    const pattern = new RegExp('test')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result).toHaveLength(0)
  })

  it('should limit context to 2 lines before and after', async () => {
    const fileContent = 'line1\nline2\nline3\nline4\nfunction test() {\nline6\nline7\nline8\nline9'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('function')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result[0].before).toEqual(['line3', 'line4'])
    expect(result[0].after).toEqual(['line6', 'line7'])
  })

  it('should handle empty lines in context', async () => {
    const fileContent = '\nline2\nfunction test() {\n\nline5'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('function')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result[0].before).toEqual(['', 'line2'])
    expect(result[0].after).toEqual(['', 'line5'])
  })

  it('should handle unicode content', async () => {
    const fileContent = 'const 测试 = "test"\nconsole.log(测试)'
    mockReadFile.mockResolvedValue(fileContent)

    const pattern = new RegExp('测试')
    const result = await searchFileContent('/path/to/file.js', 'file.js', pattern)

    expect(result).toHaveLength(2)
    expect(result[0].match).toBe('const 测试 = "test"')
    expect(result[1].match).toBe('console.log(测试)')
  })
})

describe('grepFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should find and return grep results', async () => {
    const params = { pathPattern: '\\.js$', contentPattern: 'function' }

    // Mock traversal to call our callback with file matches
    mockTraverseWithCallback.mockImplementation(async (options) => {
      const fileMatch: TraversalMatch = {
        path: 'test.js',
        fullPath: '/working/test.js',
        size: 100,
        isDirectory: false,
      }

      // Call the callback
      await options.callback(fileMatch)
      return 1
    })

    // Mock file content
    mockReadFile.mockResolvedValue('function test() {\nreturn true\n}')

    const result = await grepFiles(params)

    expect(result.totalMatches).toBe(1)
    expect(result.matches).toHaveLength(1)
    expect(result.limited).toBe(false)
    expect(result.matches[0].file).toBe('test.js')
    expect(result.matches[0].match).toBe('function test() {')
  })

  it('should skip directories', async () => {
    const params = { pathPattern: '.*', contentPattern: 'test' }

    mockTraverseWithCallback.mockImplementation(async (options) => {
      // Directory match - should be skipped
      const dirMatch: TraversalMatch = {
        path: 'src',
        fullPath: '/working/src',
        size: 4096,
        isDirectory: true,
      }

      await options.callback(dirMatch)
      return 1
    })

    const result = await grepFiles(params)

    expect(result.totalMatches).toBe(0)
    expect(result.matches).toHaveLength(0)
    expect(mockReadFile).not.toHaveBeenCalled()
  })

  it('should return empty result when no matches', async () => {
    const params = { pathPattern: '\\.nonexistent$', contentPattern: 'test' }

    mockTraverseWithCallback.mockImplementation(async () => 0)

    const result = await grepFiles(params)

    expect(result.totalMatches).toBe(0)
    expect(result.matches).toHaveLength(0)
    expect(result.limited).toBe(false)
  })

  it('should limit results to 30 matches', async () => {
    const params = { pathPattern: '\\.js$', contentPattern: 'line' }

    // Create many matches by calling callback multiple times
    mockTraverseWithCallback.mockImplementation(async (options) => {
      for (let i = 0; i < 10; i++) {
        const fileMatch: TraversalMatch = {
          path: `file${i}.js`,
          fullPath: `/working/file${i}.js`,
          size: 100,
          isDirectory: false,
        }

        const shouldContinue = await options.callback(fileMatch)
        if (shouldContinue === false) break
      }
      return 10
    })

    // Mock file content with many matches (5 per file)
    const manyLines = new Array(5).fill('line with match').join('\n')
    mockReadFile.mockResolvedValue(manyLines)

    const result = await grepFiles(params)

    expect(result.totalMatches).toBe(30)
    expect(result.limited).toBe(true)
  })

  it('should handle file read errors during traversal', async () => {
    const params = { pathPattern: '\\.js$', contentPattern: 'function' }

    mockTraverseWithCallback.mockImplementation(async (options) => {
      const fileMatch: TraversalMatch = {
        path: 'error.js',
        fullPath: '/working/error.js',
        size: 100,
        isDirectory: false,
      }

      await options.callback(fileMatch)
      return 1
    })

    // Mock file read error
    mockReadFile.mockRejectedValue(new Error('EACCES: permission denied'))

    const result = await grepFiles(params)

    expect(result.totalMatches).toBe(0)
    expect(result.matches).toHaveLength(0)
  })

  it('should pass correct options to traverseWithCallback', async () => {
    const params = { pathPattern: '\\.ts$', contentPattern: 'export' }

    mockTraverseWithCallback.mockResolvedValue(0)

    await grepFiles(params)

    expect(mockTraverseWithCallback).toHaveBeenCalledWith({
      pathPattern: expect.any(RegExp),
      maxResults: 30,
      callback: expect.any(Function),
    })

    const options = mockTraverseWithCallback.mock.calls[0][0]
    expect(options.pathPattern.source).toBe('\\.ts$')
    expect(options.maxResults).toBe(30)
  })

  it('should stop traversal when 30 matches reached', async () => {
    const params = { pathPattern: '\\.js$', contentPattern: 'test' }

    let callbackCallCount = 0
    mockTraverseWithCallback.mockImplementation(async (options) => {
      // Simulate many file matches
      for (let i = 0; i < 50; i++) {
        const fileMatch: TraversalMatch = {
          path: `file${i}.js`,
          fullPath: `/working/file${i}.js`,
          size: 100,
          isDirectory: false,
        }

        callbackCallCount++
        const shouldContinue = await options.callback(fileMatch)
        if (shouldContinue === false) break
      }
      return callbackCallCount
    })

    // Each file has 1 match
    mockReadFile.mockResolvedValue('test line')

    const result = await grepFiles(params)

    expect(result.totalMatches).toBe(30)
    expect(result.limited).toBe(true)
    // Should stop early due to callback returning false
    expect(callbackCallCount).toBeLessThan(50)
  })

  it('should handle multiple matches per file correctly', async () => {
    const params = { pathPattern: '\\.js$', contentPattern: 'var' }

    mockTraverseWithCallback.mockImplementation(async (options) => {
      const fileMatch: TraversalMatch = {
        path: 'vars.js',
        fullPath: '/working/vars.js',
        size: 100,
        isDirectory: false,
      }

      await options.callback(fileMatch)
      return 1
    })

    // File with multiple var declarations
    const fileContent = 'var a = 1\nvar b = 2\nvar c = 3'
    mockReadFile.mockResolvedValue(fileContent)

    const result = await grepFiles(params)

    expect(result.totalMatches).toBe(3)
    expect(result.matches).toHaveLength(3)
    expect(result.matches[0].line).toBe(1)
    expect(result.matches[1].line).toBe(2)
    expect(result.matches[2].line).toBe(3)
  })

  it('should handle traversal errors from shared library', async () => {
    const params = { pathPattern: 'test', contentPattern: 'function' }

    const traversalError = new Error('Permission denied')
    mockTraverseWithCallback.mockRejectedValue(traversalError)

    await expect(grepFiles(params)).rejects.toThrow('Permission denied')
  })
})
