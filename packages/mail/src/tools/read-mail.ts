import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { findMailAccount } from '../lib/accounts.js'
import { readMailContent } from '../lib/mail.service.js'

import type { ReadMailResult } from '../lib/types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerReadMailTool = (server: McpServer) =>
  registerTool(server, {
    name: 'read-mail',
    title: 'Read Mail Content',
    description:
      'Reads the content and subject/title of specified mails. If only HTML is present, converts it to plain text.',
    inputSchema: {
      username: z.string().min(1, 'username required'),
      imapServer: z.string().min(1, 'imapServer required'),
      mailIds: z.array(z.string().min(1)).min(1, 'Provide at least one mail ID'),
    },
    outputSchema: {
      mails: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          content: z.string(),
          error: z.string().optional(),
        }),
      ),
    },
    isReadOnly: true,
    async fetcher({ username, imapServer, mailIds }) {
      const account = findMailAccount({ username, host: imapServer })

      const results: ReadMailResult[] = []
      for (const mailId of mailIds) {
        // Await each call individually to handle per-mail errors
        results.push(await readMailContent(account, mailId))
      }
      return results
    },
    formatter(data) {
      return { mails: data }
    },
  })
