import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { parseMailAccounts } from '../lib/accounts.js'
import { searchMails } from '../lib/mail.service.js'

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

export const registerSearchMailsTool = (server: McpServer) =>
  registerTool(server, {
    name: 'search-mails',
    title: 'Search Mails',
    description:
      'Find mails by subject, body, or sender address across all configured accounts. At least one of searchString or fromContains must be set.',
    inputSchema: {
      searchString: z.string().min(1).optional().describe('Substring to search in subject or body.'),
      searchBody: z.boolean().optional().describe('If true, also search in mail body.'),
      fromContains: z.string().min(1).optional().describe('Substring to search in sender address.'),
    },
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
    async fetcher({ searchString, searchBody, fromContains }) {
      if (!searchString && !fromContains) {
        throw new Error('At least one of searchString or fromContains must be provided.')
      }

      const accounts = parseMailAccounts()
      const results: MailAccountResult[] = []

      for (const account of accounts) {
        const accountIdentifier = `${account.user}@${account.host}`
        try {
          const mails = await searchMails(account, { searchString, searchBody, fromContains })
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
