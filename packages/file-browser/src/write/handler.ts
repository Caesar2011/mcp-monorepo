import { formatResponse, formatError } from './formatter.js'
import { validateInput, writeFileContent } from './helper.js'

import type { WriteToolParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const writeHandler = async (params: WriteToolParams): Promise<CallToolResult> => {
  try {
    // Minimal logic - orchestrate helper and formatter calls
    const validatedParams = validateInput(params)
    const result = await writeFileContent(validatedParams)
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
