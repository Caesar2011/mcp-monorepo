#!/usr/bin/env node

import { createMcpServer, logger } from '@mcp-monorepo/shared'

import { parseMailAccounts } from './lib/accounts.js'
import { registerFetchLatestMailsTool } from './tools/fetch-latest-mails.js'
import { registerMarkMailsAsSeenTool } from './tools/mark-mails-as-seen.js'
import { registerReadMailTool } from './tools/read-mail.js'
import { registerSearchMailsTool } from './tools/search-mails.js'

createMcpServer({
  name: 'mail',
  importMetaPath: import.meta.filename,
  title: 'Mail MCP Server',
  tools: [registerFetchLatestMailsTool, registerSearchMailsTool, registerReadMailTool, registerMarkMailsAsSeenTool],
  async onReady() {
    // Validate that the MAIL_ACCOUNTS environment variable is set and correctly formatted.
    // This provides a fail-fast mechanism on server startup instead of failing on the first tool call.
    logger.info('Validating mail account configuration...')
    parseMailAccounts() // Throws on invalid or missing configuration
    logger.info('Mail account configuration is valid.')
  },
}).catch((e) => logger.error('Failed to start mail server', e))
