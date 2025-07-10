import { formatResponse, formatError } from './formatter.js'
import { validateInput, applyPatches } from './helper.js'

import type { PatchFileToolParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const patchFileHandler = async (params: PatchFileToolParams): Promise<CallToolResult> => {
  try {
    // Minimal logic - orchestrate helper and formatter calls
    const validatedParams = validateInput(params)
    const result = await applyPatches(validatedParams)
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
