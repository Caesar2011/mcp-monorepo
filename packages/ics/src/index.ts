#!/usr/bin/env node

import { createMcpServer } from '@mcp-monorepo/shared'
import { logger } from '@mcp-monorepo/shared'

import { getPreparedIcs } from './lib/event-store-2.js'
import { registerFetchEventsTool } from './tools/fetch-events.js'
import { registerGetCurrentDatetimeTool } from './tools/get-current-datetime.js'
import { registerSearchEventsTool } from './tools/search-events.js'

createMcpServer({
  name: 'ics',
  importMetaPath: import.meta.filename,
  title: 'ICS Calendar MCP Server',
  tools: [registerGetCurrentDatetimeTool, registerFetchEventsTool, registerSearchEventsTool],
  async onReady() {
    await getPreparedIcs().refresh()

    setInterval(
      () =>
        getPreparedIcs()
          .refresh()
          .catch(() => logger.error),
      1000 * 60 * 60,
    )
  },
})
