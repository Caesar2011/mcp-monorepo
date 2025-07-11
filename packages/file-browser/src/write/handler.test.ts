import { describe, it, expect, vi, afterEach } from 'vitest'

import { formatResponse, formatError } from './formatter.js'
import { writeHandler } from './handler.js'
import { validateInput, writeFileContent } from './helper.js'

import type { WriteToolParams } from './types.js'

// Mock helper and formatter functions
vi.mock('./helper.js', () => ({
  validateInput: vi.fn(),
  writeFileContent: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatResponse: vi.fn(),
  formatError: vi.fn(),
}))

vi.mock('../lib/getWorkingDirectory.js', () => ({
  getWorkingDirectory: vi.fn(() => '/working/dir'),
}))

const mockValidateInput = vi.mocked(validateInput)
const mockWriteFileContent = vi.mocked(writeFileContent)
const mockFormatResponse = vi.mocked(formatResponse)
const mockFormatError = vi.mocked(formatError)

describe('writeHandler', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should handle successful file write', async () => {
    const params: WriteToolParams = {
      filePath: 'test.txt',
      content: 'Hello world',
    }

    const validatedParams = { ...params }
    const writeResult = {
      filePath: '/working/dir/test.txt',
      bytesWritten: 11,
      created: true,
    }

    mockValidateInput.mockReturnValue(validatedParams)
    mockWriteFileContent.mockResolvedValue(writeResult)
    mockFormatResponse.mockReturnValue('File created successfully')

    const result = await writeHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockWriteFileContent).toHaveBeenCalledWith(validatedParams)
    expect(mockFormatResponse).toHaveBeenCalledWith(writeResult)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'File created successfully',
        },
      ],
    })
  })

  it('should handle validation errors', async () => {
    const params: WriteToolParams = {
      filePath: '',
      content: 'Hello world',
    }

    const validationError = new Error('filePath cannot be empty')

    mockValidateInput.mockImplementation(() => {
      throw validationError
    })
    mockFormatError.mockReturnValue('Error: filePath cannot be empty')

    const result = await writeHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockWriteFileContent).not.toHaveBeenCalled()
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

  it('should handle write operation errors', async () => {
    const params: WriteToolParams = {
      filePath: 'test.txt',
      content: 'Hello world',
    }

    const validatedParams = { ...params }
    const writeError = new Error('Permission denied')

    mockValidateInput.mockReturnValue(validatedParams)
    mockWriteFileContent.mockRejectedValue(writeError)
    mockFormatError.mockReturnValue('Error: Permission denied')

    const result = await writeHandler(params)

    expect(mockValidateInput).toHaveBeenCalledWith(params)
    expect(mockWriteFileContent).toHaveBeenCalledWith(validatedParams)
    expect(mockFormatError).toHaveBeenCalledWith(writeError)

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Error: Permission denied',
          _meta: { stderr: 'Permission denied' },
        },
      ],
    })
  })

  it('should handle non-Error exceptions', async () => {
    const params: WriteToolParams = {
      filePath: 'test.txt',
      content: 'Hello world',
    }

    const validatedParams = { ...params }
    const nonErrorException = 'String error'

    mockValidateInput.mockReturnValue(validatedParams)
    mockWriteFileContent.mockRejectedValue(nonErrorException)
    mockFormatError.mockReturnValue('Error: String error')

    const result = await writeHandler(params)

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

  it('should handle file overwrite scenario', async () => {
    const params: WriteToolParams = {
      filePath: 'existing.txt',
      content: 'Updated content',
    }

    const validatedParams = { ...params }
    const writeResult = {
      filePath: '/working/dir/existing.txt',
      bytesWritten: 15,
      created: false, // File was overwritten
    }

    mockValidateInput.mockReturnValue(validatedParams)
    mockWriteFileContent.mockResolvedValue(writeResult)
    mockFormatResponse.mockReturnValue('File overwritten successfully')

    const result = await writeHandler(params)

    expect(result.content[0].text).toBe('File overwritten successfully')
    expect(result.content[0]).not.toHaveProperty('_meta')
  })

  it('should handle empty content', async () => {
    const params: WriteToolParams = {
      filePath: 'empty.txt',
      content: '',
    }

    const validatedParams = { ...params }
    const writeResult = {
      filePath: '/working/dir/empty.txt',
      bytesWritten: 0,
      created: true,
    }

    mockValidateInput.mockReturnValue(validatedParams)
    mockWriteFileContent.mockResolvedValue(writeResult)
    mockFormatResponse.mockReturnValue('Empty file created')

    const result = await writeHandler(params)

    expect(mockWriteFileContent).toHaveBeenCalledWith(validatedParams)
    expect(result.content[0].text).toBe('Empty file created')
  })
})
