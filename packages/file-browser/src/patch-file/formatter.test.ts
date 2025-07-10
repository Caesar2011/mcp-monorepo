import { describe, it, expect } from 'vitest'

import { formatResponse, formatPatchError, formatError, formatPatchSummary } from './formatter.js'

import type { PatchFileResult, PatchError, PatchReplacement } from './types.js'

describe('formatResponse', () => {
  it('should format successful patch application with no errors', () => {
    const data: PatchFileResult = {
      filePath: '/working/dir/test.txt',
      appliedPatches: 2,
      totalPatches: 2,
      errors: [],
      bytesWritten: 150,
    }

    const result = formatResponse(data)

    expect(result).toBe('Patched file: /working/dir/test.txt\n' + 'Applied 2/2 patches\n' + 'Bytes written: 150')
  })

  it('should format partial patch application with errors', () => {
    const patch: PatchReplacement = {
      startLine: 10,
      endLine: 12,
      replacement: 'context\nlines\nhere\nnew content\nmore\ncontext\nlines',
    }

    const data: PatchFileResult = {
      filePath: '/working/dir/test.txt',
      appliedPatches: 1,
      totalPatches: 2,
      errors: [
        {
          patch,
          reason: 'Context not found',
          details: 'Could not find matching context lines in the specified range',
        },
      ],
      bytesWritten: 75,
    }

    const result = formatResponse(data)

    expect(result).toBe(
      'Patched file: /working/dir/test.txt\n' +
        'Applied 1/2 patches\n' +
        'Bytes written: 75\n' +
        '\n' +
        'Errors:\n' +
        ' 1. Lines 10-12: Context not found\n' +
        ' Details: Could not find matching context lines in the specified range',
    )
  })

  it('should format multiple errors', () => {
    const patch1: PatchReplacement = {
      startLine: 5,
      endLine: 7,
      replacement: 'invalid replacement',
    }

    const patch2: PatchReplacement = {
      startLine: 15,
      endLine: 17,
      replacement: 'another invalid',
    }

    const data: PatchFileResult = {
      filePath: '/working/dir/test.txt',
      appliedPatches: 0,
      totalPatches: 2,
      errors: [
        {
          patch: patch1,
          reason: 'Parse error',
          details: 'Replacement must have at least 6 lines',
        },
        {
          patch: patch2,
          reason: 'Context not found',
        },
      ],
      bytesWritten: 0,
    }

    const result = formatResponse(data)

    expect(result).toBe(
      'Patched file: /working/dir/test.txt\n' +
        'Applied 0/2 patches\n' +
        'Bytes written: 0\n' +
        '\n' +
        'Errors:\n' +
        ' 1. Lines 5-7: Parse error\n' +
        ' Details: Replacement must have at least 6 lines\n' +
        ' 2. Lines 15-17: Context not found',
    )
  })

  it('should handle zero bytes written', () => {
    const data: PatchFileResult = {
      filePath: '/working/dir/empty.txt',
      appliedPatches: 1,
      totalPatches: 1,
      errors: [],
      bytesWritten: 0,
    }

    const result = formatResponse(data)

    expect(result).toBe('Patched file: /working/dir/empty.txt\n' + 'Applied 1/1 patches\n' + 'Bytes written: 0')
  })

  it('should handle large byte counts', () => {
    const data: PatchFileResult = {
      filePath: '/working/dir/large.txt',
      appliedPatches: 5,
      totalPatches: 5,
      errors: [],
      bytesWritten: 1048576, // 1MB
    }

    const result = formatResponse(data)

    expect(result).toBe('Patched file: /working/dir/large.txt\n' + 'Applied 5/5 patches\n' + 'Bytes written: 1048576')
  })

  it('should handle paths with special characters', () => {
    const data: PatchFileResult = {
      filePath: '/working/dir/file with spaces & symbols.txt',
      appliedPatches: 1,
      totalPatches: 1,
      errors: [],
      bytesWritten: 42,
    }

    const result = formatResponse(data)

    expect(result).toBe(
      'Patched file: /working/dir/file with spaces & symbols.txt\n' + 'Applied 1/1 patches\n' + 'Bytes written: 42',
    )
  })
})

describe('formatPatchError', () => {
  it('should format error with details', () => {
    const patch: PatchReplacement = {
      startLine: 10,
      endLine: 15,
      replacement: 'some replacement',
    }

    const error: PatchError = {
      patch,
      reason: 'Context not found',
      details: 'Could not find matching context lines in the specified range',
    }

    const result = formatPatchError(error)

    expect(result).toBe('Lines 10-15: Context not found (Could not find matching context lines in the specified range)')
  })

  it('should format error without details', () => {
    const patch: PatchReplacement = {
      startLine: 5,
      endLine: 8,
      replacement: 'another replacement',
    }

    const error: PatchError = {
      patch,
      reason: 'Parse error',
    }

    const result = formatPatchError(error)

    expect(result).toBe('Lines 5-8: Parse error')
  })

  it('should handle single line ranges', () => {
    const patch: PatchReplacement = {
      startLine: 7,
      endLine: 7,
      replacement: 'single line replacement',
    }

    const error: PatchError = {
      patch,
      reason: 'Invalid format',
    }

    const result = formatPatchError(error)

    expect(result).toBe('Lines 7-7: Invalid format')
  })
})

describe('formatError', () => {
  it('should format Error objects', () => {
    const error = new Error('File does not exist')

    const result = formatError(error)

    expect(result).toBe('Error: File does not exist')
  })

  it('should format string errors', () => {
    const error = 'Access denied'

    const result = formatError(error)

    expect(result).toBe('Error: Access denied')
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

describe('formatPatchSummary', () => {
  it('should format successful application of all patches', () => {
    const result = formatPatchSummary(3, 3)
    expect(result).toBe('Successfully applied all 3 patches')
  })

  it('should format partial application', () => {
    const result = formatPatchSummary(2, 5)
    expect(result).toBe('Applied 2 out of 5 patches')
  })

  it('should format complete failure', () => {
    const result = formatPatchSummary(0, 4)
    expect(result).toBe('Failed to apply any of the 4 patches')
  })

  it('should handle single patch success', () => {
    const result = formatPatchSummary(1, 1)
    expect(result).toBe('Successfully applied all 1 patches')
  })

  it('should handle single patch failure', () => {
    const result = formatPatchSummary(0, 1)
    expect(result).toBe('Failed to apply any of the 1 patches')
  })

  it('should handle edge case with zero total patches', () => {
    const result = formatPatchSummary(0, 0)
    expect(result).toBe('Successfully applied all 0 patches')
  })
})
