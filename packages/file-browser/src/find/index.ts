import { z } from 'zod'

import { findHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerFindTool(server: McpServer): void {
  server.registerTool(
    'find',
    {
      title: 'Find files by regex pattern',
      description:
        'Find files and directories by matching their relative paths against a regex pattern using DFS traversal. Returns all matched paths with file sizes in a newline-separated list.',
      inputSchema: {
        pattern: z
          .string()
          .describe('Regex pattern to match against relative file/directory paths from working directory'),
      },
    },
    findHandler,
  )
}
