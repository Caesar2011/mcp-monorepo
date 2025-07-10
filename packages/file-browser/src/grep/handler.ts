import { formatResponse, formatError } from './formatter.js'
import { validateInput, grepFiles } from './helper.js'

import type { GrepToolParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const grepHandler = async (params: GrepToolParams): Promise<CallToolResult> => {
  try {
    // Minimal logic - orchestrate helper and formatter calls
    const validatedParams = validateInput(params)
    const result = await grepFiles(validatedParams)
    const formattedResponse = formatResponse(result)

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
