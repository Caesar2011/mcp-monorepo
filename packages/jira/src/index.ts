#!/usr/bin/env node

import { createMcpServer, logger } from '@mcp-monorepo/shared'

import { getJiraBaseUrl, getJiraToken } from './lib/jira-env.js'
import { getCurrentProfile } from './lib/jira.service.js'
import { registerExecuteJqlTool } from './tools/execute-jql.js'
import { registerGetCurrentProfileTool } from './tools/get-current-profile.js'
import { registerGetIssueTool } from './tools/get-issue.js'
import { registerGetLatestProjectsTool } from './tools/get-latest-projects.js'
import { registerGetTicketTransitionsTool } from './tools/get-ticket-transitions.js'
import { registerSetIssueStatusTool } from './tools/set-issue-status.js'

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
  async onReady() {
    if (process.env.JIRA_INSECURE_SKIP_VERIFY === 'true') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      logger.warn(
        'TLS certificate validation is disabled for Jira requests (JIRA_INSECURE_SKIP_VERIFY=true). This is a security risk and should only be used for trusted, self-hosted environments.',
      )
    }

    // Eagerly validate environment variables to fail fast on startup.
    getJiraBaseUrl()
    getJiraToken()

    // Perform a test API call to ensure credentials are valid and the service is reachable.
    try {
      logger.info('Verifying Jira connection and credentials...')
      const profile = await getCurrentProfile()
      logger.info(`Successfully connected to Jira as "${profile.displayName}" (${profile.emailAddress}).`)
    } catch (error) {
      logger.error('Failed to connect to Jira. Please check JIRA_BASE_URL, JIRA_TOKEN, and TLS settings.', error)
      // Re-throw to prevent the server from starting in a bad state.
      throw new Error('Jira connection verification failed.')
    }
  },
}).catch((e) => logger.error('Failed to start Jira server', e))
