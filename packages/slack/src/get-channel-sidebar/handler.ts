import { formatChannelSidebar, formatError } from './formatter.js'
import { fetchChannelSectionsAndList } from './helper.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const getChannelSidebarHandler = async (): Promise<CallToolResult> => {
  try {
    // Here you might provide real fetch & cacheDir functions
    const sections = await fetchChannelSectionsAndList()
    const formatted = formatChannelSidebar(sections)
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
