// Tests for mark-mails-as-seen helper functions
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { validateInput, findMatchingAccount, markMailsAsSeen } from './helper.js'

import type { MarkMailsAsSeenParams, AccountCredentials } from './types.js'

// Mock ImapFlow
vi.mock('imapflow', () => {
  const mockConnect = vi.fn()
  const mockGetMailboxLock = vi.fn(async () => ({
    release: vi.fn(),
  }))
  const mockFetch = vi.fn()
  const mockMessageFlagsAdd = vi.fn()
  const mockLogout = vi.fn()

  return {
    ImapFlow: vi.fn().mockImplementation(() => ({
      connect: mockConnect,
      getMailboxLock: mockGetMailboxLock,
      fetch: mockFetch,
      messageFlagsAdd: mockMessageFlagsAdd,
      logout: mockLogout,
    })),
  }
})

describe('validateInput', () => {
  it('should validate correct input', () => {
    const params: MarkMailsAsSeenParams = {
      username: 'test@example.com',
      imapServer: 'imap.example.com',
      mailIds: ['1', '2', '3'],
    }
    expect(() => validateInput(params)).not.toThrow()
  })

  it('should throw error for missing username', () => {
    const params = {
      username: '',
      imapServer: 'imap.example.com',
      mailIds: ['1'],
    } as MarkMailsAsSeenParams
    expect(() => validateInput(params)).toThrow('Username is required')
  })

  it('should throw error for missing IMAP server', () => {
    const params = {
      username: 'test@example.com',
      imapServer: '',
      mailIds: ['1'],
    } as MarkMailsAsSeenParams
    expect(() => validateInput(params)).toThrow('IMAP server is required')
  })

  it('should throw error for empty mail IDs', () => {
    const params = {
      username: 'test@example.com',
      imapServer: 'imap.example.com',
      mailIds: [],
    } as MarkMailsAsSeenParams
    expect(() => validateInput(params)).toThrow('Mail IDs array is required and must not be empty')
  })
})

describe('findMatchingAccount', () => {
  const accounts: AccountCredentials[] = [
    { user: 'user1', pass: 'pass1', host: 'host1', port: 993 },
    { user: 'user2', pass: 'pass2', host: 'host2', port: 993 },
  ]

  it('should find matching account', () => {
    const result = findMatchingAccount(accounts, 'user1', 'host1')
    expect(result).toEqual({ user: 'user1', pass: 'pass1', host: 'host1', port: 993 })
  })

  it('should throw error when no account matches', () => {
    expect(() => findMatchingAccount(accounts, 'nonexistent', 'host1')).toThrow(
      "No account found for username 'nonexistent' on server 'host1'",
    )
  })
})

describe('markMailsAsSeen', () => {
  const originalEnv = process.env.MAIL_ACCOUNTS

  beforeEach(() => {
    process.env.MAIL_ACCOUNTS = 'test@example.com:password@imap.example.com:993'
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.MAIL_ACCOUNTS = originalEnv
  })

  it('should successfully mark mails as seen', async () => {
    const { ImapFlow } = await import('imapflow')
    const mockClient = vi.mocked(new ImapFlow({ host: '', port: 1 }))

    mockClient.connect.mockResolvedValue(undefined)
    mockClient.fetch.mockImplementation(async function* () {
      yield {
        envelope: { subject: 'Test Subject' },
        uid: 123,
        seq: 456,
      }
    })
    mockClient.messageFlagsAdd.mockResolvedValue(undefined)
    mockClient.logout.mockResolvedValue(undefined)

    const params = {
      username: 'test@example.com',
      imapServer: 'imap.example.com',
      mailIds: ['123'],
    }

    const result = await markMailsAsSeen(params)

    expect(result.account).toBe('test@example.com@imap.example.com')
    expect(result.totalProcessed).toBe(1)
    expect(result.successCount).toBe(1)
    expect(result.failureCount).toBe(0)
    expect(result.results).toHaveLength(1)
    expect(result.results[0].success).toBe(true)
    expect(result.results[0].title).toBe('Test Subject')
  })
})
