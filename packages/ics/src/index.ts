#!/usr/bin/env node

import { createMcpServer, logger } from '@mcp-monorepo/shared'

import { getPreparedIcs } from './lib/event-store-2.js'
import { registerFetchEventsTool } from './tools/fetch-events.js'
import { registerGetCurrentDatetimeTool } from './tools/get-current-datetime.js'
import { registerSearchEventsTool } from './tools/search-events.js'

let refreshInterval: NodeJS.Timeout | undefined

createMcpServer({
  name: 'ics',
  importMetaPath: import.meta.filename,
  title: 'ICS Calendar MCP Server',
  tools: [registerGetCurrentDatetimeTool, registerFetchEventsTool, registerSearchEventsTool],
  async onReady() {
    await getPreparedIcs().refresh()

    refreshInterval = setInterval(
      () => {
        logger.info('Performing scheduled hourly data refresh.')
        getPreparedIcs()
          .refresh()
          .catch((err) => logger.error('Scheduled refresh failed:', err))
      },
      1000 * 60 * 60,
    )
  },
  async onClose() {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      logger.info('Cleared scheduled refresh interval.')
    }
  },
})
