import { formatTreeResponse, formatTreeError } from './formatter.js'
import { buildDirectoryTree } from './helper.js'

import type { TreeToolParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const treeHandler = async (params: TreeToolParams): Promise<CallToolResult> => {
  try {
    const result = await buildDirectoryTree(params)
    const formattedResponse = formatTreeResponse(result)

    return {
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    }
  } catch (error) {
    const errorMessage = formatTreeError(error)
    return {
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: error instanceof Error ? error.message : 'Unknown error' },
        },
      ],
    }
  }
}
