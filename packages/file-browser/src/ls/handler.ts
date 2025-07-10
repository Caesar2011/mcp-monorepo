import { formatResponse, formatError } from './formatter.js'
import { getDirectoryListing } from './helper.js'

import type { LsToolParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const lsHandler = async (params: LsToolParams): Promise<CallToolResult> => {
  try {
    const result = await getDirectoryListing(params)
    const formatted = formatResponse(result)
    return {
      content: [{ type: 'text', text: formatted }],
    }
  } catch (err) {
    return {
      content: [
        { type: 'text', text: formatError(err), _meta: { stderr: err instanceof Error ? err.message : String(err) } },
      ],
    }
  }
}
