import { describe, it, expect } from 'vitest'

import { formatResponse, formatError } from './formatter.js'

import type { OpenToolResult, FileContent } from './types.js'

describe('formatResponse', () => {
  it('should handle empty result', () => {
    const data: OpenToolResult = {
      files: [],
      totalFiles: 0,
    }

    const result = formatResponse(data)
    expect(result).toBe('No files to display')
  })

  it('should format single file result', () => {
    const data: OpenToolResult = {
      files: [
        {
          filePath: 'test.txt',
          content: 'Hello world',
          exists: true,
          size: 11,
        },
      ],
      totalFiles: 1,
    }

    const result = formatResponse(data)
    expect(result).toBe('Content of test.txt:\n\n```\nHello world\n```')
  })

  it('should format single non-existing file', () => {
    const data: OpenToolResult = {
      files: [
        {
          filePath: 'nonexistent.txt',
          content: '',
          exists: false,
          size: 0,
        },
      ],
      totalFiles: 1,
    }

    const result = formatResponse(data)
    expect(result).toBe('Content of nonexistent.txt:\n\n```\n\n```')
  })

  it('should format multiple files result', () => {
    const data: OpenToolResult = {
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
    }

    const result = formatResponse(data)
    expect(result).toBe(
      'Contents of 2 files:\n\n=== file1.txt ===\nSize: 9 bytes\n\n```\nContent 1\n```\n\n=== file2.txt ===\nSize: 9 bytes\n\n```\nContent 2\n```',
    )
  })

  it('should format multiple files with mix of existing and non-existing', () => {
    const data: OpenToolResult = {
      files: [
        {
          filePath: 'existing.txt',
          content: 'I exist!',
          exists: true,
          size: 8,
        },
        {
          filePath: 'missing.txt',
          content: '',
          exists: false,
          size: 0,
        },
      ],
      totalFiles: 2,
    }

    const result = formatResponse(data)
    expect(result).toBe(
      'Contents of 2 files:\n\n=== existing.txt ===\nSize: 8 bytes\n\n```\nI exist!\n```\n\n=== missing.txt ===\nFile not found',
    )
  })

  it('should handle empty file content', () => {
    const data: OpenToolResult = {
      files: [
        {
          filePath: 'empty.txt',
          content: '',
          exists: true,
          size: 0,
        },
      ],
      totalFiles: 1,
    }

    const result = formatResponse(data)
    expect(result).toBe('Content of empty.txt:\n\n```\n\n```')
  })

  it('should handle files with special characters in path', () => {
    const data: OpenToolResult = {
      files: [
        {
          filePath: 'special chars/file (1).txt',
          content: 'Special content',
          exists: true,
          size: 15,
        },
      ],
      totalFiles: 1,
    }

    const result = formatResponse(data)
    expect(result).toBe('Content of special chars/file (1).txt:\n\n```\nSpecial content\n```')
  })

  it('should handle unicode content', () => {
    const data: OpenToolResult = {
      files: [
        {
          filePath: 'unicode.txt',
          content: '🚀 Hello 世界',
          exists: true,
          size: 15,
        },
      ],
      totalFiles: 1,
    }

    const result = formatResponse(data)
    expect(result).toBe('Content of unicode.txt:\n\n```\n🚀 Hello 世界\n```')
  })

  it('should handle multi-line content', () => {
    const multilineContent = 'Line 1\nLine 2\nLine 3'
    const data: OpenToolResult = {
      files: [
        {
          filePath: 'multiline.txt',
          content: multilineContent,
          exists: true,
          size: 20,
        },
      ],
      totalFiles: 1,
    }

    const result = formatResponse(data)
    expect(result).toBe(`Content of multiline.txt:\n\n\`\`\`\n${multilineContent}\n\`\`\``)
  })

  it('should handle maximum files (5)', () => {
    const files: FileContent[] = []
    for (let i = 1; i <= 5; i++) {
      files.push({
        filePath: `file${i}.txt`,
        content: `Content ${i}`,
        exists: true,
        size: 9,
      })
    }

    const data: OpenToolResult = {
      files,
      totalFiles: 5,
    }

    const result = formatResponse(data)
    expect(result).toContain('Contents of 5 files:')
    expect(result).toContain('=== file1.txt ===')
    expect(result).toContain('=== file5.txt ===')
    expect(result).toContain('```\nContent 1\n```')
    expect(result).toContain('```\nContent 5\n```')
  })
})

describe('formatError', () => {
  it('should format Error objects', () => {
    const error = new Error('Test error message')
    const result = formatError(error)
    expect(result).toBe('Error: Test error message')
  })

  it('should format string errors', () => {
    const error = 'String error message'
    const result = formatError(error)
    expect(result).toBe('Error: String error message')
  })

  it('should format unknown errors', () => {
    const error = { someProperty: 'value' }
    const result = formatError(error)
    expect(result).toBe('Error: Unknown error')
  })

  it('should format undefined errors', () => {
    expect(formatError(undefined)).toBe('Error: Unknown error')
  })

  it('should format number errors', () => {
    const error = 404
    const result = formatError(error)
    expect(result).toBe('Error: Unknown error')
  })

  it('should handle empty string error', () => {
    const error = ''
    const result = formatError(error)
    expect(result).toBe('Error: ')
  })

  it('should handle error with special characters', () => {
    const error = new Error('Error with special chars: äöü 🚀')
    const result = formatError(error)
    expect(result).toBe('Error: Error with special chars: äöü 🚀')
  })
})
