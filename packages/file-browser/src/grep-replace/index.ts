import { z } from 'zod'

import { grepReplaceHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerGrepReplaceTool(server: McpServer): void {
  server.registerTool(
    'grep-replace',
    {
      title: 'Search and replace text in files',
      description:
        'Search for text patterns and replace them across multiple files or multiple occurrences. Use for small changes that need to be applied consistently across multiple locations or files.',
      inputSchema: {
        pathPattern: z.string().describe('Regex to match relative path from working directory to file/directory'),
        contentPattern: z.string().describe('Regex to search for in file content'),
        replacement: z.string().describe('The replacement text (supports $1, $2 placeholders for regex groups)'),
      },
    },
    grepReplaceHandler,
  )
}
