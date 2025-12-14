import { createMcpServer, logger } from '@mcp-monorepo/shared'

import { registerFetchLatestMailsTool } from './tools/fetch-latest-mails.js'
import { registerMarkMailsAsSeenTool } from './tools/mark-mails-as-seen.js'
import { registerReadMailTool } from './tools/read-mail.js'
import { registerSearchMailsTool } from './tools/search-mails.js'

createMcpServer({
  name: 'mail',
  importMetaPath: import.meta.filename,
  title: 'Mail MCP Server',
  tools: [registerFetchLatestMailsTool, registerSearchMailsTool, registerReadMailTool, registerMarkMailsAsSeenTool],
}).catch((e) => logger.error('Failed to start mail server', e))
