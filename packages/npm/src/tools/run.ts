import { registerTool } from '@mcp-monorepo/shared'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { executeCommand } from '../lib/executeCommand.js'
import { splitCommandArgs } from '../lib/parseArgs.js'
import { getWorkingDirectory } from '../lib/project-context.js'

export const registerRunTool = (server: McpServer) =>
  registerTool(server, {
    name: 'npm-run',
    title: 'Run npm script',
    description: 'Runs an npm script in the current workin directory',
    inputSchema: {
      scriptName: z.string().describe('The name of the npm script to run (e.g., "start", "test").'),
      args: z.string().optional().describe('Arguments to pass to the npm script as string. Seperated by spaces.'),
      workspace: z.string().optional().describe('Relative path to the package.json for a monorepo workspace'),
    },
    outputSchema: {
      exitCode: z.number(),
      stdOut: z.string(),
      stdErr: z.string(),
    },
    async fetcher({ args, scriptName, workspace }) {
      return await executeCommand(
        'npm',
        ['run', scriptName, ...(args ? splitCommandArgs(args) : []), ...(workspace ? ['--workspace', workspace] : [])],
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
