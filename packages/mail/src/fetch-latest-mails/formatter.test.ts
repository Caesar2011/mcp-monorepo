// Tests for fetch-latest-mails formatter
import { describe, it, expect } from 'vitest'

import { formatResponse, formatError } from './formatter.js'

import type { MailAccountResult } from './types.js'

describe('formatResponse', () => {
  it('formats empty results', () => {
    const data: MailAccountResult[] = [{ account: 'test@host', mails: [] }]
    expect(formatResponse(data)).toMatch('# test@host')
    expect(formatResponse(data)).toMatch('(no mails)')
  })

  it('formats single mail', () => {
    const data: MailAccountResult[] = [
      {
        account: 'foo@bar',
        mails: [
          {
            id: '123',
            subject: 'Hello',
            read: false,
            from: { address: 'a@b.com', name: 'Alice' },
            date: '2023-01-01T11:23',
          },
        ],
      },
    ]
    const line = '[ID: 123] Hello [unread][from: a@b.com <Alice>][at: 2023-01-01T11:23]'
    expect(formatResponse(data)).toMatch(line)
  })

  it('formats mail with no from name', () => {
    const data: MailAccountResult[] = [
      {
        account: 'foo@bar',
        mails: [
          {
            id: '124',
            subject: 'Hi',
            read: true,
            from: { address: 'x@y.com' },
            date: '2023-01-02T09:00',
          },
        ],
      },
    ]
    expect(formatResponse(data)).toMatch('[ID: 124] Hi [read][from: x@y.com][at: 2023-01-02T09:00]')
  })
})

describe('formatError', () => {
  it('formats Error objects', () => {
    expect(formatError(new Error('fail'))).toMatch('fail')
  })
  it('formats unknown values', () => {
    expect(formatError('err')).toMatch('err')
  })
})
