import { describe, it, expect } from 'vitest'

import { formatResponse, formatError } from './formatter.js'

import type { WriteToolResult } from './types.js'

describe('formatResponse', () => {
  it('should format successful file creation', () => {
    const data: WriteToolResult = {
      filePath: '/working/dir/test.txt',
      bytesWritten: 11,
      created: true,
    }

    const result = formatResponse(data)

    expect(result).toBe('Created file: /working/dir/test.txt\nBytes written: 11')
  })

  it('should format successful file overwrite', () => {
    const data: WriteToolResult = {
      filePath: '/working/dir/existing.txt',
      bytesWritten: 25,
      created: false,
    }

    const result = formatResponse(data)

    expect(result).toBe('Overwritten file: /working/dir/existing.txt\nBytes written: 25')
  })

  it('should format zero-byte file creation', () => {
    const data: WriteToolResult = {
      filePath: '/working/dir/empty.txt',
      bytesWritten: 0,
      created: true,
    }

    const result = formatResponse(data)

    expect(result).toBe('Created file: /working/dir/empty.txt\nBytes written: 0')
  })

  it('should format large file creation', () => {
    const data: WriteToolResult = {
      filePath: '/working/dir/large.txt',
      bytesWritten: 1048576, // 1MB
      created: true,
    }

    const result = formatResponse(data)

    expect(result).toBe('Created file: /working/dir/large.txt\nBytes written: 1048576')
  })

  it('should handle paths with special characters', () => {
    const data: WriteToolResult = {
      filePath: '/working/dir/file with spaces & symbols.txt',
      bytesWritten: 42,
      created: false,
    }

    const result = formatResponse(data)

    expect(result).toBe('Overwritten file: /working/dir/file with spaces & symbols.txt\nBytes written: 42')
  })
})

describe('formatError', () => {
  it('should format Error objects', () => {
    const error = new Error('Permission denied')

    const result = formatError(error)

    expect(result).toBe('Error: Permission denied')
  })

  it('should format string errors', () => {
    const error = 'String error message'

    const result = formatError(error)

    expect(result).toBe('Error: String error message')
  })

  it('should format undefined errors', () => {
    expect(formatError(undefined)).toBe('Error: Unknown error')
  })

  it('should format number errors', () => {
    const error = 404

    const result = formatError(error)

    expect(result).toBe('Error: Unknown error')
  })

  it('should format object errors', () => {
    const error = { code: 'ENOENT', message: 'File not found' }

    const result = formatError(error)

    expect(result).toBe('Error: Unknown error')
  })

  it('should handle empty error message', () => {
    const error = new Error('')

    const result = formatError(error)

    expect(result).toBe('Error: ')
  })

  it('should handle very long error messages', () => {
    const longMessage = 'A'.repeat(1000)
    const error = new Error(longMessage)

    const result = formatError(error)

    expect(result).toBe(`Error: ${longMessage}`)
  })
})
