import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatResponse, formatError } from './formatter.js'
import { grepReplaceHandler } from './handler.js'
import { validateInput, grepReplaceFiles } from './helper.js'

import type { GrepReplaceToolParams } from './types.js'

// Mock the helper and formatter modules
vi.mock('./helper.js', () => ({
  validateInput: vi.fn(),
  grepReplaceFiles: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatResponse: vi.fn(),
  formatError: vi.fn(),
}))

const mockValidateInput = vi.mocked(validateInput)
const mockGrepReplaceFiles = vi.mocked(grepReplaceFiles)
const mockFormatResponse = vi.mocked(formatResponse)
const mockFormatError = vi.mocked(formatError)

describe('grepReplaceHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle successful grep-replace operation', async () => {
    const params: GrepReplaceToolParams = {
      pathPattern: '\\.js$',
      contentPattern: 'console\\.log',
      replacement: 'logger.info',
    }

    const validatedParams = {
      pathPattern: '\\.js$',
      contentPattern: 'console\\.log',
      replacement: 'logger.info',
    }
    const grepReplaceResult = {
      matches: [
        {
          file: 'src/index.js',
          replacementCount: 3,
        },
        {
          file: 'src/helper.js',
          replacementCount: 1,
        },
      ],
      totalReplacements: 4,
      filesModified: ['src/helper.js', 'src/index.js'],
    }
    const formattedResponse =
      'Completed 4 replacements in 2 files.\n\nFiles modified:\n src/index.js: 3 replacements\n src/helper.js: 1 replacement'

    mockValidateInput.mockReturnValue(validatedParams)
    mockGrepReplaceFiles.mockResolvedValue(grepReplaceResult)
    mockFormatResponse.mockReturnValue(formattedResponse)

    const result = await grepReplaceHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockGrepReplaceFiles).toHaveBeenCalledWith(validatedParams)
    expect(mockFormatResponse).toHaveBeenCalledWith(grepReplaceResult)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    })
  })

  it('should handle validation errors for pathPattern', async () => {
    const params: GrepReplaceToolParams = {
      pathPattern: '[invalid',
      contentPattern: 'function',
      replacement: 'newFunction',
    }

    const validationError = new Error('Invalid pathPattern regex')
    const errorMessage = 'Error: Invalid pathPattern regex'

    mockValidateInput.mockImplementation(() => {
      throw validationError
    })
    mockFormatError.mockReturnValue(errorMessage)

    const result = await grepReplaceHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockGrepReplaceFiles).not.toHaveBeenCalled()
    expect(mockFormatResponse).not.toHaveBeenCalled()
    expect(mockFormatError).toHaveBeenCalledWith(validationError)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: 'Invalid pathPattern regex' },
        },
      ],
    })
  })

  it('should handle validation errors for contentPattern', async () => {
    const params: GrepReplaceToolParams = {
      pathPattern: '\\.js$',
      contentPattern: '[invalid',
      replacement: 'newFunction',
    }

    const validationError = new Error('Invalid contentPattern regex')
    const errorMessage = 'Error: Invalid contentPattern regex'

    mockValidateInput.mockImplementation(() => {
      throw validationError
    })
    mockFormatError.mockReturnValue(errorMessage)

    const result = await grepReplaceHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockGrepReplaceFiles).not.toHaveBeenCalled()
    expect(mockFormatResponse).not.toHaveBeenCalled()
    expect(mockFormatError).toHaveBeenCalledWith(validationError)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: 'Invalid contentPattern regex' },
        },
      ],
    })
  })

  it('should handle missing replacement parameter', async () => {
    const params = {
      pathPattern: '\\.js$',
      contentPattern: 'function',
    } as GrepReplaceToolParams

    const validationError = new Error('replacement is required and must be a string')
    const errorMessage = 'Error: replacement is required and must be a string'

    mockValidateInput.mockImplementation(() => {
      throw validationError
    })
    mockFormatError.mockReturnValue(errorMessage)

    const result = await grepReplaceHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockFormatError).toHaveBeenCalledWith(validationError)
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: 'replacement is required and must be a string' },
        },
      ],
    })
  })

  it('should handle grepReplaceFiles errors', async () => {
    const params: GrepReplaceToolParams = {
      pathPattern: '\\.txt$',
      contentPattern: 'test',
      replacement: 'testing',
    }

    const validatedParams = {
      pathPattern: '\\.txt$',
      contentPattern: 'test',
      replacement: 'testing',
    }
    const replaceError = new Error('Permission denied')
    const errorMessage = 'Error: Permission denied'

    mockValidateInput.mockReturnValue(validatedParams)
    mockGrepReplaceFiles.mockRejectedValue(replaceError)
    mockFormatError.mockReturnValue(errorMessage)

    const result = await grepReplaceHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockGrepReplaceFiles).toHaveBeenCalledWith(validatedParams)
    expect(mockFormatResponse).not.toHaveBeenCalled()
    expect(mockFormatError).toHaveBeenCalledWith(replaceError)

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
    const params: GrepReplaceToolParams = {
      pathPattern: 'test',
      contentPattern: 'function',
      replacement: 'newFunction',
    }

    const stringError = 'Something went wrong'
    const errorMessage = 'Error: Something went wrong'

    mockValidateInput.mockImplementation(() => {
      throw stringError
    })
    mockFormatError.mockReturnValue(errorMessage)

    const result = await grepReplaceHandler(params)

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

  it('should handle empty results (no matches found)', async () => {
    const params: GrepReplaceToolParams = {
      pathPattern: '\\.nonexistent$',
      contentPattern: 'nomatch',
      replacement: 'replacement',
    }

    const validatedParams = {
      pathPattern: '\\.nonexistent$',
      contentPattern: 'nomatch',
      replacement: 'replacement',
    }
    const grepReplaceResult = {
      matches: [],
      totalReplacements: 0,
      filesModified: [],
    }
    const formattedResponse = 'No matches found. No files were modified.'

    mockValidateInput.mockReturnValue(validatedParams)
    mockGrepReplaceFiles.mockResolvedValue(grepReplaceResult)
    mockFormatResponse.mockReturnValue(formattedResponse)

    const result = await grepReplaceHandler(params)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    })
  })

  it('should handle regex groups in replacement', async () => {
    const params: GrepReplaceToolParams = {
      pathPattern: '\\.js$',
      contentPattern: '(\\w+)\\.(log|error|warn)',
      replacement: 'logger.$2',
    }

    const validatedParams = {
      pathPattern: '\\.js$',
      contentPattern: '(\\w+)\\.(log|error|warn)',
      replacement: 'logger.$2',
    }
    const grepReplaceResult = {
      matches: [
        {
          file: 'src/index.js',
          replacementCount: 5,
        },
      ],
      totalReplacements: 5,
      filesModified: ['src/index.js'],
    }
    const formattedResponse = 'Completed 5 replacements in 1 file.\n\nFiles modified:\n src/index.js: 5 replacements'

    mockValidateInput.mockReturnValue(validatedParams)
    mockGrepReplaceFiles.mockResolvedValue(grepReplaceResult)
    mockFormatResponse.mockReturnValue(formattedResponse)

    const result = await grepReplaceHandler(params)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    })
  })

  it('should handle empty replacement string', async () => {
    const params: GrepReplaceToolParams = {
      pathPattern: '\\.js$',
      contentPattern: 'debugger;?',
      replacement: '',
    }

    const validatedParams = {
      pathPattern: '\\.js$',
      contentPattern: 'debugger;?',
      replacement: '',
    }
    const grepReplaceResult = {
      matches: [
        {
          file: 'src/debug.js',
          replacementCount: 2,
        },
      ],
      totalReplacements: 2,
      filesModified: ['src/debug.js'],
    }
    const formattedResponse = 'Completed 2 replacements in 1 file.\n\nFiles modified:\n src/debug.js: 2 replacements'

    mockValidateInput.mockReturnValue(validatedParams)
    mockGrepReplaceFiles.mockResolvedValue(grepReplaceResult)
    mockFormatResponse.mockReturnValue(formattedResponse)

    const result = await grepReplaceHandler(params)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    })
  })

  it('should handle missing parameters', async () => {
    const params = {} as GrepReplaceToolParams

    const validationError = new Error('pathPattern is required and must be a string')
    const errorMessage = 'Error: pathPattern is required and must be a string'

    mockValidateInput.mockImplementation(() => {
      throw validationError
    })
    mockFormatError.mockReturnValue(errorMessage)

    const result = await grepReplaceHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockFormatError).toHaveBeenCalledWith(validationError)
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: 'pathPattern is required and must be a string' },
        },
      ],
    })
  })
})
