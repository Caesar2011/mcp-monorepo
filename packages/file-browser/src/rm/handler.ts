import { formatSuccessResponse, formatErrorResponse } from './formatter.js'
import { removePaths } from './helper.js'

import type { RmToolParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const rmHandler = async (params: RmToolParams): Promise<CallToolResult> => {
  try {
    const result = await removePaths(params.paths)
    return {
      content: [{ type: 'text', text: formatSuccessResponse(result) }],
    }
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: formatErrorResponse(err),
          _meta: { stderr: err instanceof Error ? err.message : String(err) },
        },
      ],
    }
  }
}
