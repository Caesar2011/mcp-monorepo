import { describe, it, expect } from 'vitest'

import { formatResponse, formatError } from './formatter.js'

import type { FindToolResult } from './types.js'

describe('formatResponse', () => {
  it('should format empty results', () => {
    const data: FindToolResult = {
      matches: [],
      totalMatches: 0,
    }

    const result = formatResponse(data)
    expect(result).toBe('No matches found.')
  })

  it('should format single match', () => {
    const data: FindToolResult = {
      matches: [
        {
          path: 'src/index.ts',
          size: 1024,
          isDirectory: false,
        },
      ],
      totalMatches: 1,
    }

    const result = formatResponse(data)
    expect(result).toBe('src/index.ts 1024')
  })

  it('should format multiple matches with newlines', () => {
    const data: FindToolResult = {
      matches: [
        {
          path: 'src/index.ts',
          size: 1024,
          isDirectory: false,
        },
        {
          path: 'src/helper.ts',
          size: 512,
          isDirectory: false,
        },
        {
          path: 'lib',
          size: 4096,
          isDirectory: true,
        },
      ],
      totalMatches: 3,
    }

    const result = formatResponse(data)
    expect(result).toBe('src/index.ts 1024\nsrc/helper.ts 512\nlib 4096')
  })

  it('should handle files with zero size', () => {
    const data: FindToolResult = {
      matches: [
        {
          path: 'empty.txt',
          size: 0,
          isDirectory: false,
        },
      ],
      totalMatches: 1,
    }

    const result = formatResponse(data)
    expect(result).toBe('empty.txt 0')
  })

  it('should handle very large file sizes', () => {
    const data: FindToolResult = {
      matches: [
        {
          path: 'large-file.bin',
          size: 9007199254740991, // Max safe integer
          isDirectory: false,
        },
      ],
      totalMatches: 1,
    }

    const result = formatResponse(data)
    expect(result).toBe('large-file.bin 9007199254740991')
  })

  it('should handle paths with special characters', () => {
    const data: FindToolResult = {
      matches: [
        {
          path: 'files with spaces/test-file_v2.txt',
          size: 256,
          isDirectory: false,
        },
        {
          path: 'unicode-测试文件.txt',
          size: 128,
          isDirectory: false,
        },
      ],
      totalMatches: 2,
    }

    const result = formatResponse(data)
    expect(result).toBe('files with spaces/test-file_v2.txt 256\nunicode-测试文件.txt 128')
  })
})

describe('formatError', () => {
  it('should format Error objects', () => {
    const error = new Error('File not found')
    const result = formatError(error)
    expect(result).toBe('Error: File not found')
  })

  it('should format string errors', () => {
    const error = 'Invalid pattern'
    const result = formatError(error)
    expect(result).toBe('Error: Invalid pattern')
  })

  it('should format unknown error types', () => {
    const error = { code: 'ENOENT', message: 'Not found' }
    const result = formatError(error)
    expect(result).toBe('Error: Unknown error')
  })

  it('should handle null/undefined errors', () => {
    expect(formatError(undefined)).toBe('Error: Unknown error')
  })

  it('should handle empty string errors', () => {
    const result = formatError('')
    expect(result).toBe('Error: ')
  })

  it('should handle number errors', () => {
    const error = 404
    const result = formatError(error)
    expect(result).toBe('Error: Unknown error')
  })
})
