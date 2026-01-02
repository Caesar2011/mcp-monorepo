import { registerTool } from '@mcp-monorepo/shared'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { executeCommand } from '../lib/executeCommand.js'
import { getWorkingDirectory } from '../lib/project-context.js'

export const registerInstallTool = (server: McpServer) =>
  registerTool(server, {
    name: 'npm-install',
    title: 'Install npm packages',
    description: 'Installs npm packages with optional dev dependency and workspace support',
    inputSchema: {
      packageName: z
        .string()
        .optional()
        .describe('The name of the package to install. If not provided, installs all dependencies from package.json.'),
      isDev: z.boolean().optional().describe('Whether to install as a dev dependency (adds --save-dev flag)'),
      workspace: z.string().optional().describe('Relative path to the package.json for a monorepo workspace'),
    },
    outputSchema: {
      exitCode: z.number(),
      stdOut: z.string(),
      stdErr: z.string(),
    },
    async fetcher({ packageName, isDev, workspace }) {
      return await executeCommand(
        'npm',
        [
          'install',
          ...(packageName ? [packageName] : []),
          ...(isDev ? ['--save-dev'] : []),
          ...(workspace ? ['--workspace', workspace] : []),
        ],
        getWorkingDirectory(),
      )
    },
    formatter(args) {
      return {
        exitCode: args.code ?? 0,
        stdOut: args.stdout,
        stdErr: args.stderr,
      }
    },
  })
