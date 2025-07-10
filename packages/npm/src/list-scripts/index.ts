import { z } from 'zod'

import { toolHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerListScriptsTool(server: McpServer): void {
  server.registerTool(
    'list-scripts',
    {
      title: 'List npm scripts',
      description:
        "Lists all available npm scripts defined in the project's package.json file. Optionally specify a workspace (relative path to package.json).",
      inputSchema: {
        workspace: z.string().optional().describe('Relative path to the package.json for a monorepo workspace'),
      },
    },
    toolHandler,
  )
}
