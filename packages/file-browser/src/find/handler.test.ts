import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatResponse, formatError } from './formatter.js'
import { findHandler } from './handler.js'
import { validateInput, findFiles } from './helper.js'

import type { FindToolParams } from './types.js'

// Mock the helper and formatter modules
vi.mock('./helper.js', () => ({
  validateInput: vi.fn(),
  findFiles: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatResponse: vi.fn(),
  formatError: vi.fn(),
}))

const mockValidateInput = vi.mocked(validateInput)
const mockFindFiles = vi.mocked(findFiles)
const mockFormatResponse = vi.mocked(formatResponse)
const mockFormatError = vi.mocked(formatError)

describe('findHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle successful find operation', async () => {
    const params: FindToolParams = {
      pattern: '\\.ts$',
    }

    const validatedParams = { pattern: '\\.ts$' }
    const findResult = {
      matches: [
        { path: 'src/index.ts', size: 1024, isDirectory: false },
        { path: 'src/helper.ts', size: 512, isDirectory: false },
      ],
      totalMatches: 2,
    }
    const formattedResponse = 'src/index.ts 1024\nsrc/helper.ts 512'

    mockValidateInput.mockReturnValue(validatedParams)
    mockFindFiles.mockResolvedValue(findResult)
    mockFormatResponse.mockReturnValue(formattedResponse)

    const result = await findHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockFindFiles).toHaveBeenCalledWith(validatedParams)
    expect(mockFormatResponse).toHaveBeenCalledWith(findResult)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    })
  })

  it('should handle validation errors', async () => {
    const params: FindToolParams = {
      pattern: '[invalid',
    }

    const validationError = new Error('Invalid regex pattern')
    const errorMessage = 'Error: Invalid regex pattern'

    mockValidateInput.mockImplementation(() => {
      throw validationError
    })
    mockFormatError.mockReturnValue(errorMessage)

    const result = await findHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockFindFiles).not.toHaveBeenCalled()
    expect(mockFormatResponse).not.toHaveBeenCalled()
    expect(mockFormatError).toHaveBeenCalledWith(validationError)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: 'Invalid regex pattern' },
        },
      ],
    })
  })

  it('should handle findFiles errors', async () => {
    const params: FindToolParams = {
      pattern: '\\.txt$',
    }

    const validatedParams = { pattern: '\\.txt$' }
    const findError = new Error('Permission denied')
    const errorMessage = 'Error: Permission denied'

    mockValidateInput.mockReturnValue(validatedParams)
    mockFindFiles.mockRejectedValue(findError)
    mockFormatError.mockReturnValue(errorMessage)

    const result = await findHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockFindFiles).toHaveBeenCalledWith(validatedParams)
    expect(mockFormatResponse).not.toHaveBeenCalled()
    expect(mockFormatError).toHaveBeenCalledWith(findError)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: 'Permission denied' },
        },
      ],
    })
  })

  it('should handle non-Error exceptions', async () => {
    const params: FindToolParams = {
      pattern: 'test',
    }

    const stringError = 'Something went wrong'
    const errorMessage = 'Error: Something went wrong'

    mockValidateInput.mockImplementation(() => {
      throw stringError
    })
    mockFormatError.mockReturnValue(errorMessage)

    const result = await findHandler(params)

    expect(mockFormatError).toHaveBeenCalledWith(stringError)
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: 'Something went wrong' },
        },
      ],
    })
  })

  it('should handle empty results', async () => {
    const params: FindToolParams = {
      pattern: '\\.nonexistent$',
    }

    const validatedParams = { pattern: '\\.nonexistent$' }
    const findResult = {
      matches: [],
      totalMatches: 0,
    }
    const formattedResponse = 'No matches found.'

    mockValidateInput.mockReturnValue(validatedParams)
    mockFindFiles.mockResolvedValue(findResult)
    mockFormatResponse.mockReturnValue(formattedResponse)

    const result = await findHandler(params)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    })
  })

  it('should handle complex regex patterns', async () => {
    const params: FindToolParams = {
      pattern: '^(src|lib)/.*\\.(ts|js)$',
    }

    const validatedParams = { pattern: '^(src|lib)/.*\\.(ts|js)$' }
    const findResult = {
      matches: [
        { path: 'src/index.ts', size: 2048, isDirectory: false },
        { path: 'lib/utils.js', size: 1536, isDirectory: false },
      ],
      totalMatches: 2,
    }
    const formattedResponse = 'src/index.ts 2048\nlib/utils.js 1536'

    mockValidateInput.mockReturnValue(validatedParams)
    mockFindFiles.mockResolvedValue(findResult)
    mockFormatResponse.mockReturnValue(formattedResponse)

    const result = await findHandler(params)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    })
  })
})
