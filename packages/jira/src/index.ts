#!/usr/bin/env node

import { createMcpServer, logger } from '@mcp-monorepo/shared'

import { registerExecuteJqlTool } from './tools/execute-jql.js'
import { registerGetCurrentProfileTool } from './tools/get-current-profile.js'
import { registerGetIssueTool } from './tools/get-issue.js'
import { registerGetLatestProjectsTool } from './tools/get-latest-projects.js'
import { registerGetTicketTransitionsTool } from './tools/get-ticket-transitions.js'
import { registerSetIssueStatusTool } from './tools/set-issue-status.js'

// Disable self-signed certificate errors if needed for local Jira instances
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

createMcpServer({
  name: 'jira',
  importMetaPath: import.meta.filename,
  title: 'Jira MCP Server',
  tools: [
    registerGetCurrentProfileTool,
    registerExecuteJqlTool,
    registerGetLatestProjectsTool,
    registerGetIssueTool,
    registerSetIssueStatusTool,
    registerGetTicketTransitionsTool,
  ],
}).catch((e) => logger.error('Failed to start Jira server', e))
