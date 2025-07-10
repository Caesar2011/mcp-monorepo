import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js'

import { formatDatetimeResponse, formatDatetimeError } from './formatter.js'
import { getCurrentDatetime } from './helper.js'

import type { GetCurrentDatetimeParams } from './types.js'

export const toolHandler = async (params: GetCurrentDatetimeParams): Promise<CallToolResult> => {
  try {
    const result = getCurrentDatetime(params)
    return {
      content: [
        {
          type: 'text',
          text: formatDatetimeResponse(result),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatDatetimeError(error),
          _meta: { stderr: error instanceof Error ? error.message : String(error) },
        },
      ],
    }
  }
}
