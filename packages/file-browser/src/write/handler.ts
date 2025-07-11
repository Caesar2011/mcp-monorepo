import { formatResponse, formatError } from './formatter.js'
import { validateInput, writeFileContent } from './helper.js'
import { executePostWriteCommand } from '../lib/executePostWriteCommand.js'

import type { WriteToolParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const writeHandler = async (params: WriteToolParams): Promise<CallToolResult> => {
  try {
    const validatedParams = validateInput(params)
    const result = await writeFileContent(validatedParams)
    let formattedResponse = formatResponse(result)

    const lintResult = await executePostWriteCommand(result.filePath)
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
