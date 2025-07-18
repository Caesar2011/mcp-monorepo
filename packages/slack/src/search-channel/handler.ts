import { formatSearchChannelResult, formatError } from './formatter.js'
import { searchChannels } from './helper.js'

import type { SearchChannelParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const searchChannelHandler = async (params: SearchChannelParams): Promise<CallToolResult> => {
  try {
    const result = await searchChannels(params)
    const formatted = formatSearchChannelResult(result)
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
