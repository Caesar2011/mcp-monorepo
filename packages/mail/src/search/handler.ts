// Handler for the search tool
import { formatResponse, formatError } from './formatter.js'
import { searchMails } from './helper.js'

import type { SearchMailParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const toolHandler = async (params: SearchMailParams): Promise<CallToolResult> => {
  try {
    const data = await searchMails(params)
    const content = formatResponse(data)
    return {
      content: [
        {
          type: 'text',
          text: content,
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatError(error),
          _meta: { stderr: error instanceof Error ? error.stack : String(error) },
        },
      ],
    }
  }
}
