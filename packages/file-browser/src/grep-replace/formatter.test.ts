import { describe, it, expect } from 'vitest'

import { formatMatch, formatResponse, formatError } from './formatter.js'

import type { GrepReplaceToolResult, GrepReplaceMatch } from './types.js'

describe('formatMatch', () => {
  it('should format single replacement correctly', () => {
    const match: GrepReplaceMatch = {
      file: 'src/index.js',
      replacementCount: 1,
    }

    const result = formatMatch(match)

    expect(result).toBe('src/index.js: 1 replacement')
  })

  it('should format multiple replacements correctly', () => {
    const match: GrepReplaceMatch = {
      file: 'src/helper.js',
      replacementCount: 5,
    }

    const result = formatMatch(match)

    expect(result).toBe('src/helper.js: 5 replacements')
  })

  it('should handle zero replacements', () => {
    const match: GrepReplaceMatch = {
      file: 'src/empty.js',
      replacementCount: 0,
    }

    const result = formatMatch(match)

    expect(result).toBe('src/empty.js: 0 replacements')
  })

  it('should handle long file paths', () => {
    const match: GrepReplaceMatch = {
      file: 'src/very/deep/nested/directory/structure/file.js',
      replacementCount: 3,
    }

    const result = formatMatch(match)

    expect(result).toBe('src/very/deep/nested/directory/structure/file.js: 3 replacements')
  })
})

describe('formatResponse', () => {
  it('should format response with no matches', () => {
    const data: GrepReplaceToolResult = {
      matches: [],
      totalReplacements: 0,
      filesModified: [],
    }

    const result = formatResponse(data)

    expect(result).toBe('No matches found. No files were modified.')
  })

  it('should format response with single file and single replacement', () => {
    const data: GrepReplaceToolResult = {
      matches: [
        {
          file: 'src/index.js',
          replacementCount: 1,
        },
      ],
      totalReplacements: 1,
      filesModified: ['src/index.js'],
    }

    const result = formatResponse(data)

    expect(result).toBe('Completed 1 replacement in 1 file.\n\nFiles modified:\n src/index.js: 1 replacement')
  })

  it('should format response with single file and multiple replacements', () => {
    const data: GrepReplaceToolResult = {
      matches: [
        {
          file: 'src/index.js',
          replacementCount: 5,
        },
      ],
      totalReplacements: 5,
      filesModified: ['src/index.js'],
    }

    const result = formatResponse(data)

    expect(result).toBe('Completed 5 replacements in 1 file.\n\nFiles modified:\n src/index.js: 5 replacements')
  })

  it('should format response with multiple files', () => {
    const data: GrepReplaceToolResult = {
      matches: [
        {
          file: 'src/index.js',
          replacementCount: 3,
        },
        {
          file: 'src/helper.js',
          replacementCount: 2,
        },
        {
          file: 'lib/utils.js',
          replacementCount: 1,
        },
      ],
      totalReplacements: 6,
      filesModified: ['lib/utils.js', 'src/helper.js', 'src/index.js'],
    }

    const result = formatResponse(data)

    expect(result).toBe(
      'Completed 6 replacements in 3 files.\n\nFiles modified:\n src/index.js: 3 replacements\n src/helper.js: 2 replacements\n lib/utils.js: 1 replacement',
    )
  })

  it('should handle large numbers of replacements', () => {
    const data: GrepReplaceToolResult = {
      matches: [
        {
          file: 'src/large.js',
          replacementCount: 150,
        },
      ],
      totalReplacements: 150,
      filesModified: ['src/large.js'],
    }

    const result = formatResponse(data)

    expect(result).toBe('Completed 150 replacements in 1 file.\n\nFiles modified:\n src/large.js: 150 replacements')
  })

  it('should handle many files with various replacement counts', () => {
    const matches = [
      { file: 'file1.js', replacementCount: 1 },
      { file: 'file2.js', replacementCount: 0 },
      { file: 'file3.js', replacementCount: 10 },
      { file: 'file4.js', replacementCount: 5 },
    ]

    const data: GrepReplaceToolResult = {
      matches,
      totalReplacements: 16,
      filesModified: ['file1.js', 'file2.js', 'file3.js', 'file4.js'],
    }

    const result = formatResponse(data)

    expect(result).toContain('Completed 16 replacements in 4 files.')
    expect(result).toContain('file1.js: 1 replacement')
    expect(result).toContain('file2.js: 0 replacements')
    expect(result).toContain('file3.js: 10 replacements')
    expect(result).toContain('file4.js: 5 replacements')
  })
})

describe('formatError', () => {
  it('should format Error object', () => {
    const error = new Error('Test error message')

    const result = formatError(error)

    expect(result).toBe('Error: Test error message')
  })

  it('should format string error', () => {
    const error = 'String error message'

    const result = formatError(error)

    expect(result).toBe('Error: String error message')
  })

  it('should format unknown error type', () => {
    const error = { message: 'Object error' }

    const result = formatError(error)

    expect(result).toBe('Error: Unknown error')
  })

  it('should format undefined error', () => {
    const error = undefined

    const result = formatError(error)

    expect(result).toBe('Error: Unknown error')
  })

  it('should format number error', () => {
    const error = 404

    const result = formatError(error)

    expect(result).toBe('Error: Unknown error')
  })

  it('should format boolean error', () => {
    const error = false

    const result = formatError(error)

    expect(result).toBe('Error: Unknown error')
  })

  it('should format empty string error', () => {
    const error = ''

    const result = formatError(error)

    expect(result).toBe('Error: ')
  })

  it('should format complex error with stack trace', () => {
    const error = new Error('Complex error')
    error.stack = 'Error: Complex error\n at test.js:1:1'

    const result = formatError(error)

    expect(result).toBe('Error: Complex error')
  })

  it('should format error with special characters', () => {
    const error = new Error('Error with special chars: <>"&\'')

    const result = formatError(error)

    expect(result).toBe('Error: Error with special chars: <>"&\'')
  })
})
