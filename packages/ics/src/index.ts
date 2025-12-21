#!/usr/bin/env node

import { createMcpServer } from '@mcp-monorepo/shared'
import { logger } from '@mcp-monorepo/shared'

import { getPreparedIcs } from './lib/event-store-2.js'
import { registerFetchEventsTool } from './tools/fetch-events.js'
import { registerGetCurrentDatetimeTool } from './tools/get-current-datetime.js'
import { registerSearchEventsTool } from './tools/search-events.js'

process.env.CALENDAR_Arbeit =
  'https://outlook.office365.com/owa/calendar/6726b109005640a4982f52968f443e51@netlight.com/840711b63b9c446a89efbac67588c7a812184317992758283667/S-1-8-1012071154-1048752624-2164084980-293329427/reachcalendar.ics'

createMcpServer({
  name: 'ics',
  importMetaPath: import.meta.filename,
  title: 'ICS Calendar MCP Server',
  tools: [registerGetCurrentDatetimeTool, registerFetchEventsTool, registerSearchEventsTool],
}).then(() => logger.error)

getPreparedIcs()
  .refresh()
  .then(() => logger.error)
setTimeout(
  () =>
    getPreparedIcs()
      .refresh()
      .then(() => logger.error),
  1000 * 60 * 60,
)
