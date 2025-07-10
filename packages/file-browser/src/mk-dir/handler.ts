import { formatSuccessResponse, formatErrorResponse } from './formatter.js'
import { createDirectories } from './helper.js'

import type { MkDirToolParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const mkDirHandler = async (params: MkDirToolParams): Promise<CallToolResult> => {
  try {
    const result = await createDirectories(params.paths)
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
