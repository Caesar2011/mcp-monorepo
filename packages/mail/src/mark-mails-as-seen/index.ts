// Tool registration for mark-mails-as-seen
import { z } from 'zod'

import { toolHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerMarkMailsAsSeenTool(server: McpServer): void {
  server.registerTool(
    'mark-mails-as-seen',
    {
      title: 'Mark emails as seen',
      description:
        'Mark specified emails as seen/read in IMAP mailbox. Requires username, IMAP server, and list of mail IDs to mark as seen.',
      inputSchema: {
        username: z.string().describe('Username for IMAP authentication'),
        imapServer: z.string().describe('IMAP server hostname'),
        mailIds: z.array(z.string()).min(1).describe('List of mail IDs to mark as seen'),
      },
    },
    toolHandler,
  )
}
