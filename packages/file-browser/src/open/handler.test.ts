import { describe, it, expect, vi, afterEach } from 'vitest'

import { formatResponse, formatError } from './formatter.js'
import { openHandler } from './handler.js'
import { validateMultipleInput, openFiles } from './helper.js'

import type { OpenToolParams } from './types.js'

// Mock helper and formatter functions
vi.mock('./helper.js', () => ({
  validateSingleInput: vi.fn(),
  validateMultipleInput: vi.fn(),
  openFiles: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatResponse: vi.fn(),
  formatError: vi.fn(),
}))

const mockValidateMultipleInput = vi.mocked(validateMultipleInput)
const mockOpenFiles = vi.mocked(openFiles)
const mockFormatResponse = vi.mocked(formatResponse)
const mockFormatError = vi.mocked(formatError)

describe('openMultipleHandler', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should handle successful multiple file read', async () => {
    const params: OpenToolParams = {
      filePaths: ['file1.txt', 'file2.txt'],
    }
    const validatedParams = { filePaths: ['file1.txt', 'file2.txt'] }
    const openResult = {
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

    mockValidateMultipleInput.mockReturnValue(validatedParams)
    mockOpenFiles.mockResolvedValue(openResult)
    mockFormatResponse.mockReturnValue(
      'Contents of 2 files:\n\n=== file1.txt ===\nContent 1\n\n=== file2.txt ===\nContent 2',
    )

    const result = await openHandler(params)

    expect(mockValidateMultipleInput).toHaveBeenCalledWith(params)
    expect(mockOpenFiles).toHaveBeenCalledWith(validatedParams)
    expect(mockFormatResponse).toHaveBeenCalledWith(openResult)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Contents of 2 files:\n\n=== file1.txt ===\nContent 1\n\n=== file2.txt ===\nContent 2',
        },
      ],
    })
  })

  it('should handle validation errors for multiple files', async () => {
    const params: OpenToolParams = {
      filePaths: [],
    }
    const validationError = new Error('At least one file path must be provided')

    mockValidateMultipleInput.mockImplementation(() => {
      throw validationError
    })
    mockFormatError.mockReturnValue('Error: At least one file path must be provided')

    const result = await openHandler(params)

    expect(mockValidateMultipleInput).toHaveBeenCalledWith(params)
    expect(mockOpenFiles).not.toHaveBeenCalled()
    expect(mockFormatError).toHaveBeenCalledWith(validationError)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Error: At least one file path must be provided',
          _meta: { stderr: 'At least one file path must be provided' },
        },
      ],
    })
  })

  it('should handle too many files error', async () => {
    const params: OpenToolParams = {
      filePaths: ['1.txt', '2.txt', '3.txt', '4.txt', '5.txt', '6.txt'],
    }
    const validationError = new Error('Maximum 5 files can be opened at once')

    mockValidateMultipleInput.mockImplementation(() => {
      throw validationError
    })
    mockFormatError.mockReturnValue('Error: Maximum 5 files can be opened at once')

    const result = await openHandler(params)

    expect(mockValidateMultipleInput).toHaveBeenCalledWith(params)
    expect(mockFormatError).toHaveBeenCalledWith(validationError)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Error: Maximum 5 files can be opened at once',
          _meta: { stderr: 'Maximum 5 files can be opened at once' },
        },
      ],
    })
  })

  it('should handle non-Error exceptions', async () => {
    const params: OpenToolParams = {
      filePaths: ['test.txt'],
    }
    const validatedParams = { filePaths: ['test.txt'] }
    const nonErrorException = 'String error'

    mockValidateMultipleInput.mockReturnValue(validatedParams)
    mockOpenFiles.mockRejectedValue(nonErrorException)
    mockFormatError.mockReturnValue('Error: String error')

    const result = await openHandler(params)

    expect(mockFormatError).toHaveBeenCalledWith(nonErrorException)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Error: String error',
          _meta: { stderr: 'String error' },
        },
      ],
    })
  })
})
