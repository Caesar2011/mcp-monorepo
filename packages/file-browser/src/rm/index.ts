import { z } from 'zod'

import { rmHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerRmTool(server: McpServer): void {
  server.registerTool(
    'rm',
    {
      title: 'Remove Files and Directories',
      description: 'Removes files or directories within the working directory. Supports recursive directory deletion.',
      inputSchema: {
        paths: z.array(z.string()).describe('List of files or directories to remove (relative paths).'),
      },
    },
    rmHandler,
  )
}
