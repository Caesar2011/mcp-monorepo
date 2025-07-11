// Tool registration for read-mail
import { z } from 'zod'

import { toolHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerReadMailTool(server: McpServer): void {
  server.registerTool(
    'read-mail',
    {
      title: 'Read Mail Content',
      description:
        'Reads the content and subject/title of the specified mails. If only HTML is present, converts it to plain text.',
      inputSchema: {
        username: z.string().min(1, 'username required'),
        imapServer: z.string().min(1, 'imapServer required'),
        mailIds: z.array(z.string().min(1)).min(1, 'Provide at least one mail ID'),
      },
    },
    toolHandler,
  )
}
