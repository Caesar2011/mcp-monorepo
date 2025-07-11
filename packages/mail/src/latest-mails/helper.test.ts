// Tests for latest-mails/helper.ts
import { type FetchMessageObject, type MessageAddressObject } from 'imapflow'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { fetchMailsForAccount, fetchLatestMails } from './helper.js'

import type { AccountCredentials } from './types.js'

// --- ImapFlow Mock Setup ---
const mockConnect = vi.fn()
const mockLogout = vi.fn()
const mockGetMailboxLock = vi.fn()
const mockRelease = vi.fn()
const mockFetch = vi.fn()
const IMAP_MOCK = {
  connect: mockConnect,
  getMailboxLock: mockGetMailboxLock,
  fetch: mockFetch,
  logout: mockLogout,
}

vi.mock('imapflow', () => ({
  ImapFlow: vi.fn().mockImplementation(() => ({ ...IMAP_MOCK })),
}))

const OLD_ENV = process.env.MAIL_ACCOUNTS
beforeEach(() => {
  vi.clearAllMocks()
  mockGetMailboxLock.mockResolvedValue({ release: mockRelease })
})
afterEach(() => {
  process.env.MAIL_ACCOUNTS = OLD_ENV
})

// --- Helper for test mails ---
function makeEnvelope(
  opts: Partial<{
    subject: string
    from: MessageAddressObject[]
    date: Date
    uid: number
    flags: string[]
    seq: number
  }> = {},
): FetchMessageObject {
  const baseDate = new Date()
  return {
    envelope: {
      subject: opts.subject,
      from: opts.from,
      date: opts.date ?? baseDate,
    },
    uid: opts.uid ?? 123,
    flags: new Set(opts.flags ?? ['\\Seen']),
    seq: opts.seq ?? 456,
  }
}

describe('fetchMailsForAccount', () => {
  const baseAccount: AccountCredentials = {
    user: 'user',
    pass: 'pw',
    host: 'mail.host',
    port: 993,
  }

  it('returns mails from yesterday/today, filters others', async () => {
    // today
    const mailToday = makeEnvelope({ subject: 'Today', date: new Date() })
    // yesterday
    const mailYesterday = makeEnvelope({ subject: 'Yesterday', date: new Date(Date.now() - 24 * 60 * 60 * 1000) })
    // 2 days ago (should be filtered)
    const mailOld = makeEnvelope({ subject: 'Old', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) })
    mockFetch.mockImplementation(async function* () {
      yield mailToday
      yield mailYesterday
      yield mailOld
    })
    const result = await fetchMailsForAccount(baseAccount)
    expect(result.mails.length).toBe(2)
    expect(result.mails.map((m) => m.subject)).toContain('Today')
    expect(result.mails.map((m) => m.subject)).toContain('Yesterday')
    expect(result.mails.map((m) => m.subject)).not.toContain('Old')
    expect(result.account).toBe('user@mail.host')
    expect(mockConnect).toHaveBeenCalled()
    expect(mockLogout).toHaveBeenCalled()
    expect(mockRelease).toHaveBeenCalled()
  })

  it('handles mail with missing from or subject', async () => {
    mockFetch.mockImplementation(async function* () {
      yield makeEnvelope({ from: undefined, subject: undefined })
    })
    const result = await fetchMailsForAccount(baseAccount)
    expect(result.mails[0].from).toEqual({ address: undefined, name: undefined })
    expect(result.mails[0].subject).toBe('(no subject)')
  })

  it('returns empty list if no mails', async () => {
    mockFetch.mockImplementation(async function* () {})
    const result = await fetchMailsForAccount(baseAccount)
    expect(result.mails).toEqual([])
  })

  it('skips mail with envelope.date missing', async () => {
    mockFetch.mockImplementation(async function* () {
      yield { envelope: { date: undefined }, uid: 1, flags: [] }
    })
    const result = await fetchMailsForAccount(baseAccount)
    expect(result.mails).toEqual([])
  })

  it('throws and logs out on connect error', async () => {
    mockConnect.mockRejectedValueOnce(new Error('fail connect'))
    await expect(fetchMailsForAccount(baseAccount)).rejects.toThrow('fail connect')
    expect(mockLogout).not.toHaveBeenCalled() // not connected
  })

  it('throws and logs out on fetch error', async () => {
    mockFetch.mockImplementation(() => {
      throw new Error('fail fetch')
    })
    await expect(fetchMailsForAccount(baseAccount)).rejects.toThrow('fail fetch')
    expect(mockLogout).toHaveBeenCalled()
    expect(mockRelease).toHaveBeenCalled()
  })
})

describe('fetchLatestMails', () => {
  const acc1 = { user: 'user1', pass: 'pw1', host: 'mail1', port: 993 }
  const acc2 = { user: 'user2', pass: 'pw2', host: 'mail2', port: 993 }

  it('handles multiple accounts successfully', async () => {
    process.env.MAIL_ACCOUNTS = 'user1:pw1@mail1:993 user2:pw2@mail2:993'
    let call = 0
    mockFetch.mockImplementation(async function* () {
      yield makeEnvelope({ subject: `Mail${++call}` })
    })
    const results = await fetchLatestMails()
    expect(results).toHaveLength(2)
    expect(results[0].account).toBe('user1@mail1')
    expect(results[1].account).toBe('user2@mail2')
    expect(results[0].mails[0].subject).toBe('Mail1')
    expect(results[1].mails[0].subject).toBe('Mail2')
  })

  it('handles account error and continues', async () => {
    process.env.MAIL_ACCOUNTS = 'user1:pw1@mail1:993 user2:pw2@mail2:993'
    let call = 0
    mockFetch.mockImplementation(async function* () {
      if (++call === 1) throw new Error('fail1')
      yield makeEnvelope({ subject: `Mail${call}` })
    })
    // Patch fetchMailsForAccount to throw on first, succeed on second
    const orig = fetchMailsForAccount
    vi.spyOn(await import('./helper.js'), 'fetchMailsForAccount')
      .mockImplementationOnce(() => Promise.reject(new Error('fail1')))
      .mockImplementation(orig)
    const results = await fetchLatestMails()
    expect(results).toHaveLength(2)
    expect(results[0].error).toBeInstanceOf(Error)
    expect(results[1].mails[0].subject).toBe('Mail2')
  })

  it('returns [] for empty account list', async () => {
    process.env.MAIL_ACCOUNTS = ''
    await expect(fetchLatestMails()).rejects.toThrow('MAIL_ACCOUNTS env variable is not set')
  })
})
