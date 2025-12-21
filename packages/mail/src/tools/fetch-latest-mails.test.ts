import { describe, it, expect, vi, beforeEach } from 'vitest'

import { registerFetchLatestMailsTool } from './fetch-latest-mails'
import * as accounts from '../lib/accounts'
import * as mailService from '../lib/mail.service'

import type { Mail } from '../lib/types'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

vi.mock('../lib/accounts')
vi.mock('../lib/mail.service')

describe('tools/fetch-latest-mails', () => {
  let mockServer: McpServer
  let handler: (args: Record<string, unknown>) => Promise<{ content: { text: string }[] }>

  const mockAccount = { user: 'test', pass: 'pass', host: 'host', port: 993 }
  const mockMails: Mail[] = [{ uid: '1', title: 'Test', account: 'test@host', read: false, from: {}, date: '' }]

  beforeEach(() => {
    vi.clearAllMocks()
    mockServer = {
      registerTool: vi.fn((name, def, h) => {
        handler = h
      }),
    } as unknown as McpServer
    registerFetchLatestMailsTool(mockServer)
    vi.mocked(accounts.parseMailAccounts).mockReturnValue([mockAccount])
  })

  it('should register the tool', () => {
    expect(mockServer.registerTool).toHaveBeenCalledWith(
      'fetch-latest-mails',
      expect.objectContaining({
        title: 'Fetch Latest Mails',
      }),
      expect.any(Function),
    )
  })

  it('should fetch latest mails for each account', async () => {
    vi.mocked(mailService.fetchLatestMails).mockResolvedValue(mockMails)

    const result = await handler({})
    const responseData = JSON.parse(result.content[0].text).response

    expect(accounts.parseMailAccounts).toHaveBeenCalledOnce()
    expect(mailService.fetchLatestMails).toHaveBeenCalledWith(mockAccount)

    expect(responseData.success).toBe(true)
    expect(responseData.accounts).toEqual([{ account: 'test@host', mails: mockMails }])
  })

  it('should handle errors from the mail service gracefully', async () => {
    vi.mocked(mailService.fetchLatestMails).mockRejectedValue(new Error('Connection failed'))

    const result = await handler({})
    const responseData = JSON.parse(result.content[0].text).response

    expect(responseData.success).toBe(true)
    expect(responseData.accounts).toEqual([{ account: 'test@host', mails: [], error: 'Connection failed' }])
  })

  it('should return a failure response if no accounts are configured', async () => {
    vi.mocked(accounts.parseMailAccounts).mockReturnValue([])

    const result = await handler({})
    const responseData = JSON.parse(result.content[0].text).response

    expect(responseData.success).toBe(false)
    expect(responseData.error).toBe('MAIL_ACCOUNTS env variable is not configured')
  })
})
