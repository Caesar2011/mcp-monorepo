import { z } from 'zod'

import { toolHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerRunTool(server: McpServer): void {
  server.registerTool(
    'run',
    {
      title: 'Run npm script',
      description:
        "Executes a specific script defined in the project's package.json file. Optionally specify a workspace (relative path to package.json).",
      inputSchema: {
        scriptName: z.string().describe('The name of the npm script to execute (e.g., "start", "test", "build").'),
        workspace: z.string().optional().describe('Relative path to the package.json for a monorepo workspace'),
      },
    },
    toolHandler,
  )
}
