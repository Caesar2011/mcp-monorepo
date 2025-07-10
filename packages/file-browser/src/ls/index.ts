import { z } from 'zod'

import { lsHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerLsTool(server: McpServer): void {
  server.registerTool(
    'ls',
    {
      title: 'List Directory Contents',
      description:
        'Lists the files and subdirectories within a directory, indicating for each entry whether it is a file or directory, and provides file size.',
      inputSchema: {
        path: z.string().optional().describe('Relative path to the directory. Defaults to current working directory.'),
      },
    },
    lsHandler,
  )
}
