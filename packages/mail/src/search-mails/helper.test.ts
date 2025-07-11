// helper.test.ts for search-mails tool
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { searchMails } from './helper.js'
import * as parse from '../lib/parseMailAccounts.js'

const mockAccounts = [{ user: 'user', pass: 'pw', host: 'mail.test', port: 993 }]

const mockMessage = {
  uid: 1,
  envelope: { subject: 'test subject', from: [{ address: 'x@y.com', name: 'X' }], date: new Date('2023-01-01T09:00') },
  flags: ['Seen'],
}

vi.mock('imapflow', () => ({
  ImapFlow: class {
    async connect() {}
    async getMailboxLock() {
      return { release: () => {} }
    }
    async logout() {}

    async search(query: Record<string, unknown>) {
      // Mock server-side search-mails - return UIDs based on search-mails criteria
      if (query.subject && mockMessage.envelope.subject.includes(query.subject)) {
        return [1]
      }
      if (query.body && query.body === 'body') {
        return [1] // Assume body contains 'body'
      }
      if (query.from && mockMessage.envelope.from[0].address.includes(query.from)) {
        return [1]
      }
      if (query.or) {
        // Check if any OR condition matches
        for (const condition of query.or) {
          if (condition.subject && mockMessage.envelope.subject.includes(condition.subject)) {
            return [1]
          }
          if (condition.body && condition.body === 'body') {
            return [1]
          }
          if (condition.from && mockMessage.envelope.from[0].address.includes(condition.from)) {
            return [1]
          }
        }
      }
      return [] // No matches
    }

    async *fetch(uidRange: string) {
      // Only yield messages if UID 1 is requested
      if (uidRange.includes('1')) {
        yield mockMessage
      }
    }
  },
}))

describe('searchMails', () => {
  beforeEach(() => {
    vi.spyOn(parse, 'parseMailAccounts').mockReturnValue(mockAccounts)
  })

  it('finds by subject', async () => {
    const res = await searchMails({ searchString: 'test' })
    expect(res[0].mails.length).toBe(1)
    expect(res[0].mails[0].title).toBe('test subject')
  })

  it('finds by body if enabled', async () => {
    const res = await searchMails({ searchString: 'body', searchBody: true })
    expect(res[0].mails.length).toBe(1)
  })

  it('finds by fromContains', async () => {
    const res = await searchMails({ fromContains: 'x@y' })
    expect(res[0].mails.length).toBe(1)
  })

  it('returns empty result if no match', async () => {
    const res = await searchMails({ searchString: 'nope' })
    expect(res[0].mails.length).toBe(0)
  })

  it('returns empty result if no search-mails criteria', async () => {
    const res = await searchMails({})
    expect(res[0].mails.length).toBe(0)
  })
})
