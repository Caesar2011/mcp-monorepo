import { z } from 'zod'

import { toolHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export function registerInstallTool(server: McpServer): void {
  server.registerTool(
    'install',
    {
      title: 'Install npm package',
      description:
        'Installs a specified npm package into the current project. Optionally specify a workspace (relative path to package.json).',
      inputSchema: {
        packageName: z.string().describe('The name of the npm package to install (e.g., "express", "lodash").'),
        dev: z
          .boolean()
          .default(false)
          .describe(
            'Set to true to install as a development dependency (--save-dev); defaults to false for normal dependency.',
          ),
        workspace: z.string().optional().describe('Relative path to the package.json for a monorepo workspace'),
      },
    },
    toolHandler,
  )
}
