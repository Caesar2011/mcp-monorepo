import { z } from 'zod'

import { formatInstallResult, formatInstallError } from './formatter.js'
import { executeNpmCommand } from '../lib/executeNpmCommand.js'
import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

const inputSchema = z.object({
  packageName: z.string(),
  dev: z.boolean().optional().default(false),
  workspace: z.string().optional(),
})

export const toolHandler = async (input: unknown): Promise<CallToolResult> => {
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) {
    return formatInstallError('Invalid input: ' + parsed.error.message)
  }
  const { packageName, dev, workspace } = parsed.data
  const cwd = getWorkingDirectory()
  const args = workspace ? ['--workspace', workspace, 'install', packageName] : ['install', packageName]
  if (dev) args.push('--save-dev')
  const result = await executeNpmCommand('npm', args, cwd)
  // If workspace is specified and npm failed, throw error
  if (workspace && result.code !== 0) {
    return formatInstallError(result.stderr || `npm install failed in workspace ${workspace}`)
  }
  return formatInstallResult(result)
}
