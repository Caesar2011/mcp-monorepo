import { Readable } from 'stream'

import { type ImapFlow, type MailboxLockObject } from 'imapflow'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

import * as imap from './imap'
import * as mailService from './mail.service'
import * as utils from './utils'

import type { AccountCredentials } from './types'

// Mock the imap module
vi.mock('./imap', () => ({
  withImapClient: vi.fn(),
}))

// Mock the utils module
vi.mock('./utils', async (importOriginal) => {
  const original = await importOriginal<typeof utils>()
  return {
    ...original,
    streamToString: vi.fn(),
    convertHtmlToText: vi.fn(),
  }
})

describe('lib/mail.service', () => {
  const mockAccount: AccountCredentials = { user: 'test', pass: 'pass', host: 'host', port: 993 }
  let mockClient: ImapFlow & { search: Mock; fetch: Mock; fetchOne: Mock; download: Mock; messageFlagsAdd: Mock }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock imap client that will be passed by our withImapClient mock
    mockClient = {
      search: vi.fn(),
      fetch: vi.fn().mockReturnValue({
        // FIX: Add explicit dates to make sorting test deterministic.
        async *[Symbol.asyncIterator]() {
          yield { uid: '1', envelope: { subject: 'Mail 1', date: new Date('2025-01-01T10:00:00Z') }, flags: new Set() }
          yield {
            uid: '2',
            envelope: { subject: 'Mail 2', date: new Date('2025-01-01T12:00:00Z') },
            flags: new Set(['\\Seen']),
          }
        },
      }),
      fetchOne: vi.fn(),
      download: vi.fn(),
      messageFlagsAdd: vi.fn(),
    } as unknown as typeof mockClient

    // Our mock of withImapClient will immediately invoke the action with the mock client
    vi.mocked(imap.withImapClient).mockImplementation(async (account, action) => {
      return action(mockClient, {} as MailboxLockObject)
    })
  })

  describe('searchMails', () => {
    it('should build a search query and return mapped mails', async () => {
      mockClient.search.mockResolvedValue(['1', '2'])
      const result = await mailService.searchMails(mockAccount, { searchString: 'hello' })
      expect(mockClient.search).toHaveBeenCalledWith({ subject: 'hello' }, { uid: true })
      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('Mail 2') // Sorted by date desc, mocked fetch is not sorted
      expect(result[1].read).toBe(false)
    })
  })

  describe('fetchLatestMails', () => {
    it('should search with a "since" date and return mails', async () => {
      mockClient.search.mockResolvedValue(['1', '2'])
      const result = await mailService.fetchLatestMails(mockAccount)
      expect(mockClient.search).toHaveBeenCalledWith({ since: expect.any(Date) }, { uid: true })
      expect(result).toHaveLength(2)
    })
  })

  describe('readMailContent', () => {
    it('should read plain text content', async () => {
      mockClient.fetchOne.mockResolvedValue({
        envelope: { subject: 'Plain Text Mail' },
        bodyStructure: { type: 'text/plain', part: '1' },
      })
      mockClient.download.mockResolvedValue({ content: Readable.from('plain content') })
      vi.mocked(utils.streamToString).mockResolvedValue('plain content')

      const result = await mailService.readMailContent(mockAccount, '1')
      expect(result.content).toBe('plain content')
      expect(result.error).toBeUndefined()
      expect(utils.convertHtmlToText).not.toHaveBeenCalled()
    })

    it('should read and convert html content if plain is missing', async () => {
      mockClient.fetchOne.mockResolvedValue({
        envelope: { subject: 'HTML Mail' },
        bodyStructure: { type: 'text/html', part: '1.2' },
      })
      mockClient.download.mockResolvedValue({ content: Readable.from('<h1>html</h1>') })
      vi.mocked(utils.streamToString).mockResolvedValue('<h1>html</h1>')
      vi.mocked(utils.convertHtmlToText).mockReturnValue('html')

      const result = await mailService.readMailContent(mockAccount, '2')
      expect(result.content).toBe('html')
      expect(result.error).toBeUndefined()
    })

    it('should return an error if mail is not found', async () => {
      vi.mocked(imap.withImapClient).mockRejectedValue(new Error('Mail not found'))
      const result = await mailService.readMailContent(mockAccount, '999')
      expect(result.error).toBe('Mail not found')
      expect(result.content).toBe('')
    })
  })

  describe('markMailAsSeen', () => {
    it('should mark a mail as seen and return success', async () => {
      mockClient.fetchOne.mockResolvedValue({ envelope: { subject: 'Unread Mail' } })
      mockClient.messageFlagsAdd.mockResolvedValue(undefined)

      const result = await mailService.markMailAsSeen(mockAccount, '1')
      expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith('1', ['\\Seen'], { uid: true })
      expect(result.success).toBe(true)
      expect(result.title).toBe('Unread Mail')
    })

    it('should return an error result on failure', async () => {
      vi.mocked(imap.withImapClient).mockRejectedValue(new Error('IMAP error'))
      const result = await mailService.markMailAsSeen(mockAccount, '1')
      expect(result.success).toBe(false)
      expect(result.error).toBe('IMAP error')
    })
  })
})
