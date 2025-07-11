// Isolated tests for shared parseMailAccounts
import { describe, it, expect, afterEach } from 'vitest'

import { parseMailAccounts } from './parseMailAccounts.js'

describe('parseMailAccounts (lib)', () => {
  const ORIGINAL_ENV = process.env.MAIL_ACCOUNTS
  afterEach(() => {
    process.env.MAIL_ACCOUNTS = ORIGINAL_ENV
  })

  it('parses multiple valid accounts', () => {
    process.env.MAIL_ACCOUNTS = 'user1:pw1@host1:993 user2:pw2@host2:993'
    expect(parseMailAccounts()).toEqual([
      { user: 'user1', pass: 'pw1', host: 'host1', port: 993 },
      { user: 'user2', pass: 'pw2', host: 'host2', port: 993 },
    ])
  })

  it('handles colon & @ in password', () => {
    process.env.MAIL_ACCOUNTS = 'foo:b@r:pw@imap.bar:993'
    expect(parseMailAccounts()).toEqual([{ user: 'foo', pass: 'b@r:pw', host: 'imap.bar', port: 993 }])
  })

  it('throws on missing env', () => {
    delete process.env.MAIL_ACCOUNTS
    expect(() => parseMailAccounts()).toThrow('MAIL_ACCOUNTS env variable is not set')
  })

  it('throws on entry missing @', () => {
    process.env.MAIL_ACCOUNTS = 'user:pw-host:993'
    expect(() => parseMailAccounts()).toThrow(/Invalid MAIL_ACCOUNTS entry/)
  })

  it('throws on entry missing colon', () => {
    process.env.MAIL_ACCOUNTS = 'userpw@host:993'
    expect(() => parseMailAccounts()).toThrow(/Invalid MAIL_ACCOUNTS entry/)
  })

  it('throws on entry with bad host:port', () => {
    process.env.MAIL_ACCOUNTS = 'user:pw@host993'
    expect(() => parseMailAccounts()).toThrow(/Invalid MAIL_ACCOUNTS entry/)
  })
})
