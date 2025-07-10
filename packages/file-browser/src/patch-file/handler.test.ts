import { describe, it, expect, vi, afterEach } from 'vitest'

import { formatResponse, formatError } from './formatter.js'
import { patchFileHandler } from './handler.js'
import { validateInput, applyPatches } from './helper.js'

import type { PatchFileToolParams } from './types.js'

// Mock helper and formatter functions
vi.mock('./helper.js', () => ({
  validateInput: vi.fn(),
  applyPatches: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatResponse: vi.fn(),
  formatError: vi.fn(),
}))

const mockValidateInput = vi.mocked(validateInput)
const mockApplyPatches = vi.mocked(applyPatches)
const mockFormatResponse = vi.mocked(formatResponse)
const mockFormatError = vi.mocked(formatError)

describe('patchFileHandler', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should handle successful patch application', async () => {
    const params: PatchFileToolParams = {
      filePath: 'test.txt',
      patches: [
        {
          startLine: 1,
          endLine: 3,
          replacement: 'line1\nline2\nline3\nnew content\nline4\nline5\nline6',
        },
      ],
    }

    const validatedParams = { ...params }
    const patchResult = {
      filePath: '/working/dir/test.txt',
      appliedPatches: 1,
      totalPatches: 1,
      errors: [],
      bytesWritten: 42,
    }

    mockValidateInput.mockReturnValue(validatedParams)
    mockApplyPatches.mockResolvedValue(patchResult)
    mockFormatResponse.mockReturnValue('Patches applied successfully')

    const result = await patchFileHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockApplyPatches).toHaveBeenCalledWith(validatedParams)
    expect(mockFormatResponse).toHaveBeenCalledWith(patchResult)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Patches applied successfully',
        },
      ],
    })
  })

  it('should handle validation errors', async () => {
    const params: PatchFileToolParams = {
      filePath: '',
      patches: [],
    }

    const validationError = new Error('filePath cannot be empty')

    mockValidateInput.mockImplementation(() => {
      throw validationError
    })
    mockFormatError.mockReturnValue('Error: filePath cannot be empty')

    const result = await patchFileHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockApplyPatches).not.toHaveBeenCalled()
    expect(mockFormatError).toHaveBeenCalledWith(validationError)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Error: filePath cannot be empty',
          _meta: { stderr: 'filePath cannot be empty' },
        },
      ],
    })
  })

  it('should handle patch application errors', async () => {
    const params: PatchFileToolParams = {
      filePath: 'test.txt',
      patches: [
        {
          startLine: 1,
          endLine: 3,
          replacement: 'context\nlines\nhere\nnew content\nmore\ncontext\nlines',
        },
      ],
    }

    const validatedParams = { ...params }
    const patchError = new Error('File does not exist')

    mockValidateInput.mockReturnValue(validatedParams)
    mockApplyPatches.mockRejectedValue(patchError)
    mockFormatError.mockReturnValue('Error: File does not exist')

    const result = await patchFileHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockApplyPatches).toHaveBeenCalledWith(validatedParams)
    expect(mockFormatError).toHaveBeenCalledWith(patchError)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Error: File does not exist',
          _meta: { stderr: 'File does not exist' },
        },
      ],
    })
  })

  it('should handle non-Error exceptions', async () => {
    const params: PatchFileToolParams = {
      filePath: 'test.txt',
      patches: [
        {
          startLine: 1,
          endLine: 2,
          replacement: 'valid\nreplacement\nformat\nnew content\nmore\nvalid\nlines',
        },
      ],
    }

    const validatedParams = { ...params }
    const nonErrorException = 'String error'

    mockValidateInput.mockReturnValue(validatedParams)
    mockApplyPatches.mockRejectedValue(nonErrorException)
    mockFormatError.mockReturnValue('Error: String error')

    const result = await patchFileHandler(params)

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

  it('should handle partial patch application success', async () => {
    const params: PatchFileToolParams = {
      filePath: 'test.txt',
      patches: [
        {
          startLine: 1,
          endLine: 2,
          replacement: 'line1\nline2\nline3\nnew content 1\nline4\nline5\nline6',
        },
        {
          startLine: 10,
          endLine: 11,
          replacement: 'line8\nline9\nline10\nnew content 2\nline11\nline12\nline13',
        },
      ],
    }

    const validatedParams = { ...params }
    const patchResult = {
      filePath: '/working/dir/test.txt',
      appliedPatches: 1,
      totalPatches: 2,
      errors: [
        {
          patch: params.patches[1],
          reason: 'Context not found',
          details: 'Could not find matching context lines in the specified range',
        },
      ],
      bytesWritten: 85,
    }

    mockValidateInput.mockReturnValue(validatedParams)
    mockApplyPatches.mockResolvedValue(patchResult)
    mockFormatResponse.mockReturnValue('Applied 1/2 patches with errors')

    const result = await patchFileHandler(params)

    expect(result.content[0].text).toBe('Applied 1/2 patches with errors')
    expect(result.content[0]).not.toHaveProperty('_meta')
  })

  it('should handle empty patches array after validation', async () => {
    const params: PatchFileToolParams = {
      filePath: 'test.txt',
      patches: [
        {
          startLine: 1,
          endLine: 1,
          replacement: 'context1\ncontext2\ncontext3\nsingle line\nafter1\nafter2\nafter3',
        },
      ],
    }

    const validatedParams = { ...params }
    const patchResult = {
      filePath: '/working/dir/test.txt',
      appliedPatches: 1,
      totalPatches: 1,
      errors: [],
      bytesWritten: 50,
    }

    mockValidateInput.mockReturnValue(validatedParams)
    mockApplyPatches.mockResolvedValue(patchResult)
    mockFormatResponse.mockReturnValue('Single patch applied successfully')

    const result = await patchFileHandler(params)

    expect(mockApplyPatches).toHaveBeenCalledWith(validatedParams)
    expect(result.content[0].text).toBe('Single patch applied successfully')
  })

  it('should handle multiple patch types (SOF, EOF, normal)', async () => {
    const params: PatchFileToolParams = {
      filePath: 'test.txt',
      patches: [
        {
          startLine: 1,
          endLine: 2,
          replacement: '<SOF>\nnew first line\ncontext1\ncontext2\ncontext3',
        },
        {
          startLine: 10,
          endLine: 11,
          replacement: 'before1\nbefore2\nbefore3\nmiddle content\nafter1\nafter2\nafter3',
        },
        {
          startLine: 20,
          endLine: 21,
          replacement: 'last1\nlast2\nlast3\nnew last line\n<EOF>',
        },
      ],
    }

    const validatedParams = { ...params }
    const patchResult = {
      filePath: '/working/dir/test.txt',
      appliedPatches: 3,
      totalPatches: 3,
      errors: [],
      bytesWritten: 150,
    }

    mockValidateInput.mockReturnValue(validatedParams)
    mockApplyPatches.mockResolvedValue(patchResult)
    mockFormatResponse.mockReturnValue('All patches applied successfully')

    const result = await patchFileHandler(params)

    expect(result.content[0].text).toBe('All patches applied successfully')
  })
})
