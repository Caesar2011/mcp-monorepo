// formatter.test.ts for search tool
import { describe, it, expect } from 'vitest'

import { formatResponse, formatError } from './formatter.js'

describe('formatResponse', () => {
  it('shows matching mails', () => {
    const out = formatResponse([
      {
        account: 'a@b',
        mails: [
          {
            uid: '1',
            account: 'a@b',
            title: 'Hello',
            read: false,
            from: { address: 'x@y', name: 'Z' },
            date: '2023-01-01T09:00',
          },
        ],
      },
    ])
    expect(out).toContain('Hello')
    expect(out).toContain('[ID: 1]')
    expect(out).toContain('unread')
    expect(out).toContain('x@y')
    expect(out).toContain('Z')
  })
  it('shows empty if no mails', () => {
    const out = formatResponse([{ account: 'a@b', mails: [] }])
    expect(out).toContain('(no matching mails)')
  })
})

describe('formatError', () => {
  it('formats error message', () => {
    expect(formatError(new Error('fail'))).toContain('fail')
  })
})
