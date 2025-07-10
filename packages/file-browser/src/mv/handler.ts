import { formatSuccessResponse, formatErrorResponse } from './formatter.js'
import { movePaths } from './helper.js'

import type { MvToolParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const mvHandler = async (params: MvToolParams): Promise<CallToolResult> => {
  try {
    const result = await movePaths(params.sourcePaths, params.targetPaths)
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
