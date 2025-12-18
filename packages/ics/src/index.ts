#!/usr/bin/env node

import { createMcpServer } from '@mcp-monorepo/shared'
import { logger } from '@mcp-monorepo/shared'

import { getRawEvents } from './lib/event-store.js'
import { registerFetchEventsTool } from './tools/fetch-events.js'
import { registerGetCurrentDatetimeTool } from './tools/get-current-datetime.js'
import { registerSearchEventsTool } from './tools/search-events.js'

createMcpServer({
  name: 'ics',
  importMetaPath: import.meta.filename,
  title: 'ICS Calendar MCP Server',
  tools: [registerGetCurrentDatetimeTool, registerFetchEventsTool, registerSearchEventsTool],
}).then(() => logger.error)

getRawEvents()
  .refresh()
  .then(() => logger.error)
setTimeout(
  () =>
    getRawEvents()
      .refresh()
      .then(() => logger.error),
  1000 * 60 * 60,
)
