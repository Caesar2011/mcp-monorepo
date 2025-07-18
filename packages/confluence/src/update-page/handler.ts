/**
 * Handler for update-page tool
 */
import { formatUpdatePageResponse, formatUpdatePageError } from './formatter.js'
import { fetchUpdatePage } from './helper.js'

import type { UpdatePageParams, ConfluenceUpdatePageResponse } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const updatePageHandler = async (params: UpdatePageParams): Promise<CallToolResult> => {
  try {
    const response = await fetchUpdatePage(params)
    const status = response.status
    let data: ConfluenceUpdatePageResponse | undefined
    try {
      data = (await response.json()) as ConfluenceUpdatePageResponse
    } catch {
      data = undefined
    }
    return {
      content: [
        {
          type: 'text',
          text: formatUpdatePageResponse(status, data),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatUpdatePageError(error),
        },
      ],
    }
  }
}
