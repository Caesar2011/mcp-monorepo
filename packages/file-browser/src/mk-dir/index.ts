import { z } from 'zod'

import { mkDirHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerMkDirTool(server: McpServer): void {
  server.registerTool(
    'mk-dir',
    {
      title: 'Create Directories',
      description: 'Creates directories recursively within the working directory.',
      inputSchema: {
        paths: z.array(z.string()).describe('List of directories to create (relative paths).'),
      },
    },
    mkDirHandler,
  )
}
