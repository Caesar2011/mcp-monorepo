import { z } from 'zod'

import { formatRunResult, formatRunError } from './formatter.js'
import { executeNpmCommand } from '../lib/executeNpmCommand.js'
import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

const inputSchema = z.object({
  scriptName: z.string(),
  workspace: z.string().optional(),
})

export const toolHandler = async (input: unknown): Promise<CallToolResult> => {
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) {
    return formatRunError('Invalid input: ' + parsed.error.message)
  }
  const { scriptName, workspace } = parsed.data
  const cwd = getWorkingDirectory()
  const args = workspace ? ['--workspace', workspace, 'run', scriptName] : ['run', scriptName]
  const result = await executeNpmCommand('npm', args, cwd)
  // If workspace is specified and npm failed, throw error
  if (workspace && result.code !== 0) {
    return formatRunError(result.stderr || `npm run failed in workspace ${workspace}`)
  }
  return formatRunResult(result)
}
