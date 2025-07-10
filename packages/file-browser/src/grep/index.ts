import { z } from 'zod'

import { grepHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGrepTool(server: McpServer): void {
  server.registerTool(
    'grep',
    {
      title: 'Search file content by regex',
      description:
        'Find content within files by regex. Matches files whose relative path matches the pathPattern (regex), and then finds the contentPattern (regex) within those files. Returns up to 30 matches with 2 lines of context before and after each match.',
      inputSchema: {
        pathPattern: z.string().describe('Regex to match relative path from working directory to file/directory'),
        contentPattern: z.string().describe('Regex to search for in file content'),
      },
    },
    grepHandler,
  )
}
