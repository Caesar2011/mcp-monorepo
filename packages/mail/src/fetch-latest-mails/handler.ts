// Handler for fetch-latest-mails tool
import { formatResponse, formatError } from './formatter.js'
import { fetchLatestMails } from './helper.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const toolHandler = async (): Promise<CallToolResult> => {
  try {
    const data = await fetchLatestMails()
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
