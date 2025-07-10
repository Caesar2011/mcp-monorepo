import { z } from 'zod'

import { mvHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerMvTool(server: McpServer): void {
  server.registerTool(
    'mv',
    {
      title: 'Move Files and Directories',
      description:
        'Moves files or directories within the working directory. Accepts a list of source and target paths.',
      inputSchema: {
        sourcePaths: z.array(z.string()).describe('List of source file or directory paths (relative paths).'),
        targetPaths: z.array(z.string()).describe('List of corresponding target paths (relative paths).'),
      },
    },
    mvHandler,
  )
}
