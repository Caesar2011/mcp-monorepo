import { z } from 'zod'

import { writeHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerWriteTool(server: McpServer): void {
  server.registerTool(
    'write',
    {
      title: 'Write to file',
      description:
        'Create or completely overwrite a file with new content. Use for major changes, refactorings, or when replacing large portions of a file where other tools would be insufficient.',
      inputSchema: {
        filePath: z.string().describe('Relative path to the file to write'),
        content: z.string().describe('Content to write to the file'),
      },
    },
    writeHandler,
  )
}
