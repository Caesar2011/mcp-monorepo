import { z } from 'zod'

import { openHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerOpenTool(server: McpServer): void {
  server.registerTool(
    'open',
    {
      title: 'Open multiple files',
      description: 'Read and return the content of a single or multiple files (max 5).',
      inputSchema: {
        filePaths: z
          .array(z.string())
          .min(1, 'At least one file path is required')
          .max(5, 'Maximum 5 files can be opened')
          .describe('Array of relative file paths to open (max 5 files)'),
      },
    },
    openHandler,
  )
}
