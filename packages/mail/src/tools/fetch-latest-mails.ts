import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { parseMailAccounts } from '../lib/accounts.js'
import { fetchLatestMails } from '../lib/mail.service.js'

import type { MailAccountResult } from '../lib/types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const mailSchema = z.object({
  uid: z.string(),
  account: z.string(),
  title: z.string(),
  read: z.boolean(),
  from: z.object({
    address: z.string().optional(),
    name: z.string().optional(),
  }),
  date: z.string(),
})

export const registerFetchLatestMailsTool = (server: McpServer) =>
  registerTool(server, {
    name: 'fetch-latest-mails',
    title: 'Fetch Latest Mails',
    description: 'Query all mails from the past two days for all configured accounts. No parameters.',
    inputSchema: {},
    outputSchema: {
      accounts: z.array(
        z.object({
          account: z.string(),
          mails: z.array(mailSchema),
          error: z.string().optional(),
        }),
      ),
    },
    isReadOnly: true,
    async fetcher() {
      const accounts = parseMailAccounts()
      if (!accounts.length) {
        throw new Error('MAIL_ACCOUNTS env variable is not configured correctly')
      }

      const results: MailAccountResult[] = []

      for (const account of accounts) {
        const accountIdentifier = `${account.user}@${account.host}`
        try {
          const mails = await fetchLatestMails(account)
          results.push({ account: accountIdentifier, mails })
        } catch (error) {
          results.push({
            account: accountIdentifier,
            mails: [],
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
      return results
    },
    formatter(data) {
      return {
        accounts: data,
      }
    },
  })
