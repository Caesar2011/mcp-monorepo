// handler.test.ts for search tool
import { describe, it, expect, vi } from 'vitest'

import { toolHandler } from './handler.js'
import * as helper from './helper.js'

// Mock helper
vi.spyOn(helper, 'searchMails')

const mockResult = [
  {
    account: 'test@example.com',
    mails: [
      {
        uid: '123',
        account: 'test@example.com',
        title: 'Hello World',
        read: false,
        from: { address: 'alice@example.com', name: 'Alice' },
        date: '2023-01-01T12:00',
      },
    ],
  },
]

describe('toolHandler', () => {
  it('returns formatted result on success', async () => {
    helper.searchMails.mockResolvedValueOnce(mockResult)
    const result = await toolHandler({ searchString: 'Hello' })
    expect(result.content[0].text).toContain('Hello World')
  })

  it('formats errors', async () => {
    helper.searchMails.mockRejectedValueOnce(new Error('fail'))
    const result = await toolHandler({ searchString: 'X' })
    expect(result.content[0].text).toContain('Error: fail')
  })
})
