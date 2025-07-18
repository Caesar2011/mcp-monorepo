/**
 * Handler for open-page tool
 */
import { formatOpenPageResponse, formatOpenPageError } from './formatter.js'
import { fetchConfluencePage } from './helper.js'

import type { OpenPageParams, ConfluencePageResponse } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const openPageHandler = async (params: OpenPageParams): Promise<CallToolResult> => {
  try {
    const response = await fetchConfluencePage(params)
    const status = response.status
    let data: ConfluencePageResponse | undefined
    try {
      data = (await response.json()) as ConfluencePageResponse
    } catch {
      data = undefined
    }
    return {
      content: [
        {
          type: 'text',
          text: formatOpenPageResponse(status, data),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatOpenPageError(error),
        },
      ],
    }
  }
}
