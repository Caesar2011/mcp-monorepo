import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatResponse, formatError } from './formatter.js'
import { grepHandler } from './handler.js'
import { validateInput, grepFiles } from './helper.js'

import type { GrepToolParams } from './types.js'

// Mock the helper and formatter modules
vi.mock('./helper.js', () => ({
  validateInput: vi.fn(),
  grepFiles: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatResponse: vi.fn(),
  formatError: vi.fn(),
}))

const mockValidateInput = vi.mocked(validateInput)
const mockGrepFiles = vi.mocked(grepFiles)
const mockFormatResponse = vi.mocked(formatResponse)
const mockFormatError = vi.mocked(formatError)

describe('grepHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle successful grep operation', async () => {
    const params: GrepToolParams = {
      pathPattern: '\\.js$',
      contentPattern: 'function',
    }

    const validatedParams = { pathPattern: '\\.js$', contentPattern: 'function' }
    const grepResult = {
      matches: [
        {
          file: 'src/index.js',
          line: 5,
          match: 'function test() {',
          before: ['line3', 'line4'],
          after: ['line6', 'line7'],
        },
        {
          file: 'src/helper.js',
          line: 10,
          match: 'function helper() {',
          before: ['// Helper', ''],
          after: ['return true', '}'],
        },
      ],
      totalMatches: 2,
      limited: false,
    }
    const formattedResponse =
      'src/index.js:5\n3-line3\n4-line4\n5:function test() {\n6-line6\n7-line7\n--\nsrc/helper.js:10\n8-// Helper\n9-\n10:function helper() {\n11-return true\n12-}'

    mockValidateInput.mockReturnValue(validatedParams)
    mockGrepFiles.mockResolvedValue(grepResult)
    mockFormatResponse.mockReturnValue(formattedResponse)

    const result = await grepHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockGrepFiles).toHaveBeenCalledWith(validatedParams)
    expect(mockFormatResponse).toHaveBeenCalledWith(grepResult)

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
    const params: GrepToolParams = {
      pathPattern: '[invalid',
      contentPattern: 'function',
    }

    const validationError = new Error('Invalid pathPattern regex')
    const errorMessage = 'Error: Invalid pathPattern regex'

    mockValidateInput.mockImplementation(() => {
      throw validationError
    })
    mockFormatError.mockReturnValue(errorMessage)

    const result = await grepHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockGrepFiles).not.toHaveBeenCalled()
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
    const params: GrepToolParams = {
      pathPattern: '\\.js$',
      contentPattern: '[invalid',
    }

    const validationError = new Error('Invalid contentPattern regex')
    const errorMessage = 'Error: Invalid contentPattern regex'

    mockValidateInput.mockImplementation(() => {
      throw validationError
    })
    mockFormatError.mockReturnValue(errorMessage)

    const result = await grepHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockGrepFiles).not.toHaveBeenCalled()
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

  it('should handle grepFiles errors', async () => {
    const params: GrepToolParams = {
      pathPattern: '\\.txt$',
      contentPattern: 'test',
    }

    const validatedParams = { pathPattern: '\\.txt$', contentPattern: 'test' }
    const grepError = new Error('Permission denied')
    const errorMessage = 'Error: Permission denied'

    mockValidateInput.mockReturnValue(validatedParams)
    mockGrepFiles.mockRejectedValue(grepError)
    mockFormatError.mockReturnValue(errorMessage)

    const result = await grepHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockGrepFiles).toHaveBeenCalledWith(validatedParams)
    expect(mockFormatResponse).not.toHaveBeenCalled()
    expect(mockFormatError).toHaveBeenCalledWith(grepError)

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
    const params: GrepToolParams = {
      pathPattern: 'test',
      contentPattern: 'function',
    }

    const stringError = 'Something went wrong'
    const errorMessage = 'Error: Something went wrong'

    mockValidateInput.mockImplementation(() => {
      throw stringError
    })
    mockFormatError.mockReturnValue(errorMessage)

    const result = await grepHandler(params)

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
    const params: GrepToolParams = {
      pathPattern: '\\.nonexistent$',
      contentPattern: 'nomatch',
    }

    const validatedParams = { pathPattern: '\\.nonexistent$', contentPattern: 'nomatch' }
    const grepResult = {
      matches: [],
      totalMatches: 0,
      limited: false,
    }
    const formattedResponse = 'No matches found.'

    mockValidateInput.mockReturnValue(validatedParams)
    mockGrepFiles.mockResolvedValue(grepResult)
    mockFormatResponse.mockReturnValue(formattedResponse)

    const result = await grepHandler(params)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    })
  })

  it('should handle limited results (30 matches)', async () => {
    const params: GrepToolParams = {
      pathPattern: '\\.js$',
      contentPattern: 'var',
    }

    const validatedParams = { pathPattern: '\\.js$', contentPattern: 'var' }
    const matches = new Array(30).fill(undefined).map((_, i) => ({
      file: `file${i}.js`,
      line: 1,
      match: 'var test = 1',
      before: [],
      after: [],
    }))

    const grepResult = {
      matches,
      totalMatches: 30,
      limited: true,
    }
    const formattedResponse =
      'Many matches...\n\nNote: Results limited to 30 matches. There may be more matches available.'

    mockValidateInput.mockReturnValue(validatedParams)
    mockGrepFiles.mockResolvedValue(grepResult)
    mockFormatResponse.mockReturnValue(formattedResponse)

    const result = await grepHandler(params)

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
    const params: GrepToolParams = {
      pathPattern: '^(src|lib)/.*\\.(ts|js)$',
      contentPattern: 'export\\s+(const|function|class)\\s+\\w+',
    }

    const validatedParams = {
      pathPattern: '^(src|lib)/.*\\.(ts|js)$',
      contentPattern: 'export\\s+(const|function|class)\\s+\\w+',
    }
    const grepResult = {
      matches: [
        {
          file: 'src/index.ts',
          line: 3,
          match: 'export const API_URL = "https://api.example.com"',
          before: ['// Configuration', ''],
          after: ['', 'export function init() {'],
        },
        {
          file: 'lib/utils.js',
          line: 15,
          match: 'export class Helper {',
          before: ['', '// Utility class'],
          after: [' constructor() {', ' this.name = "helper"'],
        },
      ],
      totalMatches: 2,
      limited: false,
    }
    const formattedResponse = 'Complex pattern matches formatted response'

    mockValidateInput.mockReturnValue(validatedParams)
    mockGrepFiles.mockResolvedValue(grepResult)
    mockFormatResponse.mockReturnValue(formattedResponse)

    const result = await grepHandler(params)

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
    const params = {} as GrepToolParams

    const validationError = new Error('pathPattern is required and must be a string')
    const errorMessage = 'Error: pathPattern is required and must be a string'

    mockValidateInput.mockImplementation(() => {
      throw validationError
    })
    mockFormatError.mockReturnValue(errorMessage)

    const result = await grepHandler(params)

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
