// Tests for mark-mails-as-seen handler
import { describe, it, expect, vi } from 'vitest'

import { toolHandler } from './handler.js'

import type { MarkMailsAsSeenParams } from './types.js'

// Mock the helper and formatter modules
vi.mock('./helper.js', () => ({
  validateInput: vi.fn(),
  markMailsAsSeen: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatResponse: vi.fn(),
  formatError: vi.fn(),
}))

describe('toolHandler', () => {
  it('should return successful response', async () => {
    const { validateInput, markMailsAsSeen } = await import('./helper.js')
    const { formatResponse } = await import('./formatter.js')

    const mockParams: MarkMailsAsSeenParams = {
      username: 'test@example.com',
      imapServer: 'imap.example.com',
      mailIds: ['1', '2'],
    }

    const mockValidatedParams = mockParams
    const mockResult = {
      account: 'test@example.com@imap.example.com',
      totalProcessed: 2,
      successCount: 2,
      failureCount: 0,
      results: [],
    }
    const mockFormattedResponse = 'Formatted success response'

    vi.mocked(validateInput).mockReturnValue(undefined)
    vi.mocked(markMailsAsSeen).mockResolvedValue(mockResult)
    vi.mocked(formatResponse).mockReturnValue(mockFormattedResponse)

    const result = await toolHandler(mockParams)

    expect(validateInput).toHaveBeenCalledWith(mockParams)
    expect(markMailsAsSeen).toHaveBeenCalledWith(mockValidatedParams)
    expect(formatResponse).toHaveBeenCalledWith(mockResult)
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: mockFormattedResponse,
        },
      ],
    })
  })

  it('should return error response when validation fails', async () => {
    const { validateInput } = await import('./helper.js')
    const { formatError } = await import('./formatter.js')

    const mockParams: MarkMailsAsSeenParams = {
      username: '',
      imapServer: 'imap.example.com',
      mailIds: ['1'],
    }

    const mockError = new Error('Username is required')
    const mockFormattedError = 'Error: Username is required'

    vi.mocked(validateInput).mockImplementation(() => {
      throw mockError
    })
    vi.mocked(formatError).mockReturnValue(mockFormattedError)

    const result = await toolHandler(mockParams)

    expect(formatError).toHaveBeenCalledWith(mockError)
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: mockFormattedError,
          _meta: { stderr: mockError.stack },
        },
      ],
    })
  })

  it('should return error response when markMailsAsSeen fails', async () => {
    const { validateInput, markMailsAsSeen } = await import('./helper.js')
    const { formatError } = await import('./formatter.js')

    const mockParams: MarkMailsAsSeenParams = {
      username: 'test@example.com',
      imapServer: 'imap.example.com',
      mailIds: ['1'],
    }

    const mockError = new Error('Connection failed')
    const mockFormattedError = 'Error: Connection failed'

    vi.mocked(validateInput).mockReturnValue(undefined)
    vi.mocked(markMailsAsSeen).mockRejectedValue(mockError)
    vi.mocked(formatError).mockReturnValue(mockFormattedError)

    const result = await toolHandler(mockParams)

    expect(formatError).toHaveBeenCalledWith(mockError)
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: mockFormattedError,
          _meta: { stderr: mockError.stack },
        },
      ],
    })
  })

  it('should handle non-Error exceptions', async () => {
    const { validateInput } = await import('./helper.js')
    const { formatError } = await import('./formatter.js')

    const mockParams: MarkMailsAsSeenParams = {
      username: 'test@example.com',
      imapServer: 'imap.example.com',
      mailIds: ['1'],
    }

    const mockError = 'String error'
    const mockFormattedError = 'Error: String error'

    vi.mocked(validateInput).mockImplementation(() => {
      throw mockError
    })
    vi.mocked(formatError).mockReturnValue(mockFormattedError)

    const result = await toolHandler(mockParams)

    expect(formatError).toHaveBeenCalledWith(mockError)
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: mockFormattedError,
          _meta: { stderr: 'String error' },
        },
      ],
    })
  })
})
