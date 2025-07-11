import { describe, it, expect, vi } from 'vitest'

import { toolHandler } from './handler.js'
import { fetchLatestMails } from './helper.js'

vi.mock('./helper.js', () => ({ fetchLatestMails: vi.fn() }))

describe('toolHandler', () => {
  it('returns formatted content on success', async () => {
    vi.mocked(fetchLatestMails).mockResolvedValue([
      {
        account: 'a@h',
        mails: [{ id: '1', subject: 's', read: true, from: { address: 'a' }, date: '2023-01-01T00:00' }],
      },
    ])
    const result = await toolHandler()
    expect(result.content[0].text).toMatch('ID: 1')
  })

  it('returns error content on failure', async () => {
    vi.mocked(fetchLatestMails).mockRejectedValue(new Error('fail'))
    const result = await toolHandler()
    expect(result.content[0].text).toMatch('fail')
  })
})
