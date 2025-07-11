import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { parseMailAccounts } from './helper.js'

vi.mock('./helper.js', async (importOriginal) => {
  const original = (await importOriginal()) as Record<'parseMailAccounts' | 'fetchLatestMails', () => void>
  return {
    fetchMailsForAccount: vi.fn(),
    parseMailAccounts: original.parseMailAccounts,
    fetchLatestMails: vi.fn(original.fetchLatestMails),
  }
})

describe('parseMailAccounts', () => {
  const OLD_ENV = process.env
  beforeEach(() => {
    process.env = { ...OLD_ENV }
    vi.resetAllMocks()
  })
  afterEach(() => {
    process.env = OLD_ENV
  })

  it('parses valid env string', () => {
    process.env.MAIL_ACCOUNTS = 'a:b@x.com:993 foo:bar@h:123'
    const res = parseMailAccounts()
    expect(res).not.toBeUndefined()
    expect(res).toHaveLength(2)
    expect(res[0]).toMatchObject({ user: 'a', pass: 'b', host: 'x.com', port: 993 })
    expect(res[1]).toMatchObject({ user: 'foo', pass: 'bar', host: 'h', port: 123 })
  })

  it('throws on missing env', () => {
    delete process.env.MAIL_ACCOUNTS
    expect(() => parseMailAccounts()).toThrow()
  })

  it('throws on malformed entry', () => {
    process.env.MAIL_ACCOUNTS = 'invalid'
    expect(() => parseMailAccounts()).toThrow()
  })
})
