import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getCurrentProfile } from '../lib/jira.service.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerGetCurrentProfileTool = (server: McpServer) =>
  registerTool(server, {
    name: 'get-current-profile',
    title: 'Get Current Jira Profile',
    description: 'Get information about the current authenticated Jira user.',
    inputSchema: {},
    outputSchema: {
      displayName: z.string(),
      emailAddress: z.string(),
      accountId: z.string(),
    },
    isReadOnly: true,
    async fetcher() {
      return getCurrentProfile()
    },
    formatter(data) {
      return {
        displayName: data.displayName,
        emailAddress: data.emailAddress,
        accountId: data.accountId,
      }
    },
  })
