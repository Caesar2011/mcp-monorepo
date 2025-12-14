import { readFile } from 'fs/promises'
import { join } from 'path'

import { registerTool } from '@mcp-monorepo/shared'
import { type PackageJson } from 'types-package-json'
import { z } from 'zod'

import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerListScriptsTool = (server: McpServer) =>
  registerTool(server, {
    name: 'list-scripts',
    title: 'List npm scripts',
    description:
      "Lists all available npm scripts defined in the project's package.json file. Optionally specify a workspace (relative path to package.json).",
    inputSchema: {
      workspace: z.string().optional().describe('Relative path to the package.json for a monorepo workspace'),
    },
    outputSchema: {
      scripts: z.record(z.string(), z.string()),
    },
    isReadOnly: true,
    async fetcher({ workspace }) {
      const workingDir = getWorkingDirectory()
      const packageJsonPath = workspace ? join(workingDir, workspace, 'package.json') : join(workingDir, 'package.json')

      try {
        const packageJsonContent = await readFile(packageJsonPath, 'utf-8')
        const packageJson = JSON.parse(packageJsonContent) as Partial<PackageJson>

        return {
          scripts: packageJson.scripts || {},
        }
      } catch (error) {
        throw new Error(
          `Failed to read package.json at ${packageJsonPath}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    },
    formatter(args) {
      return {
        scripts: args.scripts,
      }
    },
  })
