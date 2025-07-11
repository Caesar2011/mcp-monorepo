// Tests for read-mail/helper.ts
import { Readable } from 'stream'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { readMailContents } from './helper.js'

import type { ReadMailParams } from './types.js'

// --- ImapFlow Mock Setup ---
const mockConnect = vi.fn()
const mockLogout = vi.fn()
const mockGetMailboxLock = vi.fn()
const mockRelease = vi.fn()
const mockFetch = vi.fn()
const mockDownload = vi.fn()

function ReadableFrom(text: string) {
  return Readable.from([Buffer.from(text, 'utf8')])
}

vi.mock('imapflow', () => ({
  ImapFlow: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    getMailboxLock: mockGetMailboxLock,
    fetch: mockFetch,
    download: mockDownload,
    logout: mockLogout,
  })),
}))

vi.mock('html-to-text', async () => ({
  htmlToText: vi.fn((html) => `[textified] ${html}`),
}))

const OLD_ENV = process.env.MAIL_ACCOUNTS
beforeEach(() => {
  vi.clearAllMocks()
  mockGetMailboxLock.mockResolvedValue({ release: mockRelease })
})
afterEach(() => {
  process.env.MAIL_ACCOUNTS = OLD_ENV
})

describe('readMailContents', () => {
  const accountEnv = 'user:pw@imap.com:993'
  const params: ReadMailParams = { username: 'user', imapServer: 'imap.com', mailIds: ['111', '222'] }
  beforeEach(() => {
    process.env.MAIL_ACCOUNTS = accountEnv
  })

  it('returns text part if available', async () => {
    mockFetch.mockImplementation(async function* () {
      yield {
        envelope: { subject: 'subj', from: [{ address: 'a', name: 'b' }], date: new Date() },
        bodyStructure: { type: 'text/plain', part: '1' },
      }
    })
    mockDownload.mockResolvedValue({ content: ReadableFrom('mailtext') })
    const result = await readMailContents({ ...params, mailIds: ['111'] })
    expect(result[0].content).toBe('mailtext')
    expect(result[0].title).toBe('subj')
    expect(mockDownload).toHaveBeenCalledWith('111', '1', { uid: true })
  })

  it('returns html as text if no plain', async () => {
    mockFetch.mockImplementation(async function* () {
      yield {
        envelope: { subject: 'htmlsub', from: [{ address: 'a', name: 'b' }], date: new Date() },
        bodyStructure: { type: 'text/html', part: '2' },
      }
    })
    mockDownload.mockResolvedValue({ content: ReadableFrom('<div>hi</div>') })
    const result = await readMailContents({ ...params, mailIds: ['222'] })
    expect(result[0].content).toContain('[textified] <div>hi</div>')
    expect(result[0].title).toBe('htmlsub')
    expect(mockDownload).toHaveBeenCalledWith('222', '2', { uid: true })
  })

  it('returns error if neither text nor html present', async () => {
    mockFetch.mockImplementation(async function* () {
      yield {
        envelope: { subject: 'no', date: new Date() },
        bodyStructure: { type: 'application/octet-stream', part: 'X' },
      }
    })
    const result = await readMailContents({ ...params, mailIds: ['111'] })
    expect(result[0].error).toMatch(/No viewable part/i)
    expect(result[0].content).toBe('')
  })

  it('returns error if mail is missing', async () => {
    mockFetch.mockImplementation(async function* () {})
    const result = await readMailContents({ ...params, mailIds: ['999'] })
    expect(result[0].error).toMatch(/No bodystructure/)
  })

  it('returns error if account not found', async () => {
    process.env.MAIL_ACCOUNTS = 'other:pw@imap.com:993'
    const result = await readMailContents(params)
    expect(result[0].error).toMatch(/Account not found/)
  })

  it('returns error if download throws', async () => {
    mockFetch.mockImplementation(async function* () {
      yield {
        envelope: { subject: 'err', date: new Date() },
        bodyStructure: { type: 'text/plain', part: '1' },
      }
    })
    mockDownload.mockRejectedValueOnce(new Error('fail download'))
    const result = await readMailContents({ ...params, mailIds: ['111'] })
    expect(result[0].error).toMatch(/fail download/)
  })
})
