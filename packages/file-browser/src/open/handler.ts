import { formatResponse, formatError } from './formatter.js'
import { validateMultipleInput, openFiles } from './helper.js'

import type { OpenToolParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

// Handler for multiple files open
export const openHandler = async (params: OpenToolParams): Promise<CallToolResult> => {
  try {
    // Minimal logic - orchestrate helper and formatter calls
    const validatedParams = validateMultipleInput(params)
    const result = await openFiles(validatedParams)
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
