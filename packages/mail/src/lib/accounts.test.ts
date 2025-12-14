import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { findMailAccount, parseMailAccounts } from './accounts'

describe('lib/accounts', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('parseMailAccounts', () => {
    it('should parse a single valid account string', () => {
      vi.stubEnv('MAIL_ACCOUNTS', 'user1:pass1@imap.example.com:993')
      const accounts = parseMailAccounts()
      expect(accounts).toEqual([{ user: 'user1', pass: 'pass1', host: 'imap.example.com', port: 993 }])
    })

    it('should parse multiple valid account strings', () => {
      vi.stubEnv('MAIL_ACCOUNTS', 'user1:pass1@host1:993 user2:p@ss:word@host2:143')
      const accounts = parseMailAccounts()
      expect(accounts).toEqual([
        { user: 'user1', pass: 'pass1', host: 'host1', port: 993 },
        { user: 'user2', pass: 'p@ss:word', host: 'host2', port: 143 },
      ])
    })

    it('should throw an error if MAIL_ACCOUNTS is not set', () => {
      vi.stubEnv('MAIL_ACCOUNTS', '')
      expect(() => parseMailAccounts()).toThrow('MAIL_ACCOUNTS env variable is not set')
    })

    it.each([
      ['user:pass', 'Could not split at LAST @'],
      ['user@host:port', 'missing colon in user:pass'],
      ['user:pass@host', 'Invalid MAIL_ACCOUNTS entry (host:port)'],
    ])('should throw for malformed entry "%s"', (entry, expectedError) => {
      vi.stubEnv('MAIL_ACCOUNTS', entry)
      expect(() => parseMailAccounts()).toThrow(expectedError)
    })
  })

  describe('findMailAccount', () => {
    beforeEach(() => {
      vi.stubEnv('MAIL_ACCOUNTS', 'testuser:testpass@testhost:993 another:user@otherhost:993')
    })

    it('should find and return the correct account', () => {
      const account = findMailAccount({ username: 'testuser', host: 'testhost' })
      expect(account).toEqual({ user: 'testuser', pass: 'testpass', host: 'testhost', port: 993 })
    })

    it('should throw an error if the account is not found', () => {
      expect(() => findMailAccount({ username: 'nouser', host: 'nohost' })).toThrow(
        'Account for nouser@nohost not found in configuration.',
      )
    })
  })
})
