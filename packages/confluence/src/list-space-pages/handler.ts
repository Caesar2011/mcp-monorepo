/**
 * Handler for list-space-pages tool
 */
import { formatListSpacePagesResponse, formatListSpacePagesError } from './formatter.js'
import { fetchListSpacePages } from './helper.js'

import type { ListSpacePagesParams, ConfluenceListPagesResponse } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const listSpacePagesHandler = async (params: ListSpacePagesParams): Promise<CallToolResult> => {
  try {
    const response = await fetchListSpacePages(params)
    const status = response.status
    let data: ConfluenceListPagesResponse | undefined
    try {
      data = (await response.json()) as ConfluenceListPagesResponse
    } catch {
      data = undefined
    }
    return {
      content: [
        {
          type: 'text',
          text: formatListSpacePagesResponse(status, data),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatListSpacePagesError(error),
        },
      ],
    }
  }
}
