import { formatChannelContent, formatError } from './formatter.js'
import { fetchChannelContent } from './helper.js'

import type { GetChannelContentParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const getChannelContentHandler = async (params: GetChannelContentParams): Promise<CallToolResult> => {
  try {
    const result = await fetchChannelContent(params)
    const formatted = formatChannelContent(result)
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
