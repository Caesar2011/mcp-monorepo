import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { findMailAccount } from '../lib/accounts.js'
import { markMailAsSeen } from '../lib/mail.service.js'

import type { MailMarkResult } from '../lib/types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerMarkMailsAsSeenTool = (server: McpServer) =>
  registerTool(server, {
    name: 'mark-mails-as-seen',
    title: 'Mark Mails as Seen',
    description:
      'Marks specified emails as seen/read in the INBOX. Requires username, IMAP server, and a list of mail UIDs.',
    inputSchema: {
      username: z.string().describe('Username for IMAP authentication'),
      imapServer: z.string().describe('IMAP server hostname'),
      mailIds: z.array(z.string()).min(1).describe('List of mail UIDs to mark as seen'),
    },
    outputSchema: {
      account: z.string(),
      totalProcessed: z.number(),
      successCount: z.number(),
      failureCount: z.number(),
      results: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          success: z.boolean(),
          error: z.string().optional(),
        }),
      ),
    },
    isDestructive: true,
    async fetcher({ username, imapServer, mailIds }) {
      const account = findMailAccount({ username, host: imapServer })

      const results: MailMarkResult[] = []
      for (const mailId of mailIds) {
        // Await each call individually to handle per-mail errors
        results.push(await markMailAsSeen(account, mailId))
      }

      return {
        account: `${account.user}@${account.host}`,
        totalProcessed: mailIds.length,
        successCount: results.filter((r) => r.success).length,
        failureCount: results.filter((r) => !r.success).length,
        results,
      }
    },
    formatter(data) {
      return data
    },
  })
