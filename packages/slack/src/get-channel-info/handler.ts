import { formatChannelInfo, formatError } from './formatter.js'
import { fetchChannelInfo } from './helper.js'

import type { GetChannelInfoParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const getChannelInfoHandler = async (params: GetChannelInfoParams): Promise<CallToolResult> => {
  try {
    const info = await fetchChannelInfo(params)
    const formatted = formatChannelInfo(info)
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
