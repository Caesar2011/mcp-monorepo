import { formatResponse, formatError } from './formatter.js'
import { validateInput, applyPatches } from './helper.js'
import { executePostWriteCommand } from '../lib/executePostWriteCommand.js'

import type { PatchFileToolParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const patchFileHandler = async (params: PatchFileToolParams): Promise<CallToolResult> => {
  try {
    const validatedParams = validateInput(params)
    const result = await applyPatches(validatedParams)
    let formattedResponse = formatResponse(result)

    const lintResult = await executePostWriteCommand(validatedParams.filePath)
    if (lintResult) {
      formattedResponse += `\n\nPost-write lint script (${lintResult.command}) executed. Writing was successful.`
      if (lintResult.stdout.trim()) {
        formattedResponse += '\n\nPost-write lint output: ' + lintResult.stdout
      }
      if (lintResult.code !== 0 || lintResult.stderr.trim()) {
        formattedResponse += '\n\nPost-write lint error: ' + lintResult.stderr
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    }
  } catch (error) {
    const errorMessage = formatError(error)
    return {
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: error instanceof Error ? error.message : String(error) },
        },
      ],
    }
  }
}
