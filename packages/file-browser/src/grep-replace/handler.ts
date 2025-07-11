import { formatResponse, formatError } from './formatter.js'
import { validateInput, grepReplaceFiles } from './helper.js'
import { executePostWriteCommand } from '../lib/executePostWriteCommand.js'

import type { GrepReplaceToolParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const grepReplaceHandler = async (params: GrepReplaceToolParams): Promise<CallToolResult> => {
  try {
    const validatedParams = validateInput(params)
    const result = await grepReplaceFiles(validatedParams)
    let formattedResponse = formatResponse(result)

    const lintResult = await executePostWriteCommand(result.filesModified)
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
