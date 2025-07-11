// Handler for mark-as-seen tool
import { formatResponse, formatError } from './formatter.js'
import { validateInput, markMailsAsSeen } from './helper.js'

import type { MarkAsSeenParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const toolHandler = async (params: MarkAsSeenParams): Promise<CallToolResult> => {
  try {
    validateInput(params)
    const data = await markMailsAsSeen(params)
    const formattedResponse = formatResponse(data)

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
          _meta: { stderr: error instanceof Error ? error.stack : String(error) },
        },
      ],
    }
  }
}
