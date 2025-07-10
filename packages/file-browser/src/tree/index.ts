import { z } from 'zod'

import { treeHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerTreeTool(server: McpServer): void {
  server.registerTool(
    'tree',
    {
      title: 'Show Directory Tree',
      description:
        'Show all files and directories recursively with .gitignore support. Returns a JSON tree structure with file sizes and metadata.',
      inputSchema: {
        path: z.string().optional().describe('Relative path to the directory. Defaults to current working directory.'),
        depth: z.number().min(1).max(5).optional().describe('Maximum depth to traverse (default: 3, max: 5)'),
      },
    },
    treeHandler,
  )
}
