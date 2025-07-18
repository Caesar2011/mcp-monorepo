import { formatDmList, formatError } from './formatter.js'
import { fetchDmList } from './helper.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const getDmListHandler = async (): Promise<CallToolResult> => {
  try {
    const list = await fetchDmList()
    const formatted = formatDmList(list)
    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    }
  } catch (error) {
    const message = formatError(error)
    return {
      content: [
        {
          type: 'text',
          text: message,
          _meta: { stderr: error instanceof Error ? error.message : 'Unknown error' },
        },
      ],
    }
  }
}
