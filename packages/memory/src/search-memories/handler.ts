import { formatSearchResults } from './formatter.js'
import { searchMemoriesByKeyword } from './helper.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const searchMemoriesHandler = async (params: { keyword: string }): Promise<CallToolResult> => {
  try {
    const results = searchMemoriesByKeyword(params.keyword)
    if (!results.length) {
      return { content: [{ type: 'text', text: `No memories found for keyword: ${params.keyword}` }] }
    }
    return { content: [{ type: 'text', text: formatSearchResults(results, params.keyword) }] }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error searching memories: ${message}`,
          _meta: { stderr: message },
        },
      ],
    }
  }
}
