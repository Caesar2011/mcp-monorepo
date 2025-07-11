// Tests for mark-mails-as-seen formatter functions
import { describe, it, expect } from 'vitest'

import { formatResponse, formatError } from './formatter.js'

import type { MarkMailsAsSeenResult, MailMarkResult } from './types.js'

describe('formatResponse', () => {
  it('should format successful results', () => {
    const results: MailMarkResult[] = [
      { id: '1', title: 'First Email', success: true },
      { id: '2', title: 'Second Email', success: true },
    ]

    const data: MarkMailsAsSeenResult = {
      account: 'test@example.com@imap.example.com',
      totalProcessed: 2,
      successCount: 2,
      failureCount: 0,
      results,
    }

    const result = formatResponse(data)
    const expected = [
      '# Mark as Seen Results for test@example.com@imap.example.com',
      'Total processed: 2 | Successful: 2 | Failed: 0',
      '',
      '✓ [ID: 1] First Email',
      '✓ [ID: 2] Second Email',
    ].join('\n')

    expect(result).toBe(expected)
  })

  it('should format mixed success and failure results', () => {
    const results: MailMarkResult[] = [
      { id: '1', title: 'Success Email', success: true },
      { id: '2', title: 'Failed Email', success: false, error: 'Message not found' },
    ]

    const data: MarkMailsAsSeenResult = {
      account: 'test@example.com@imap.example.com',
      totalProcessed: 2,
      successCount: 1,
      failureCount: 1,
      results,
    }

    const result = formatResponse(data)
    const expected = [
      '# Mark as Seen Results for test@example.com@imap.example.com',
      'Total processed: 2 | Successful: 1 | Failed: 1',
      '',
      '✓ [ID: 1] Success Email',
      '✗ [ID: 2] Failed Email (Error: Message not found)',
    ].join('\n')

    expect(result).toBe(expected)
  })

  it('should format empty results', () => {
    const data: MarkMailsAsSeenResult = {
      account: 'test@example.com@imap.example.com',
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0,
      results: [],
    }

    const result = formatResponse(data)
    const expected = [
      '# Mark as Seen Results for test@example.com@imap.example.com',
      'Total processed: 0 | Successful: 0 | Failed: 0',
      '(no mails processed)',
    ].join('\n')

    expect(result).toBe(expected)
  })

  it('should include account error when present', () => {
    const results: MailMarkResult[] = [{ id: '1', title: 'Test Email', success: true }]

    const data: MarkMailsAsSeenResult = {
      account: 'test@example.com@imap.example.com',
      totalProcessed: 1,
      successCount: 1,
      failureCount: 0,
      results,
      error: 'Connection timeout',
    }

    const result = formatResponse(data)
    expect(result).toContain('Account Error: Connection timeout')
  })

  it('should handle mails with no subject', () => {
    const results: MailMarkResult[] = [{ id: '1', title: '(no subject)', success: true }]

    const data: MarkMailsAsSeenResult = {
      account: 'test@example.com@imap.example.com',
      totalProcessed: 1,
      successCount: 1,
      failureCount: 0,
      results,
    }

    const result = formatResponse(data)
    expect(result).toContain('✓ [ID: 1] (no subject)')
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
    expect(result).toBe('Error: Unknown error')
  })

  it('should format unknown errors', () => {
    const error = { someProperty: 'value' }
    const result = formatError(error)
    expect(result).toBe('Error: Unknown error')
  })

  it('should handle undefined errors', () => {
    expect(formatError(undefined)).toBe('Error: Unknown error')
    expect(formatError(undefined)).toBe('Error: Unknown error')
  })
})
