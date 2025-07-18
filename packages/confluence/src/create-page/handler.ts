/**
 * Handler for create-page tool
 */
import { formatCreatePageResponse, formatCreatePageError } from './formatter.js'
import { fetchCreatePage } from './helper.js'

import type { CreatePageParams, ConfluenceCreatePageResponse } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const createPageHandler = async (params: CreatePageParams): Promise<CallToolResult> => {
  try {
    const response = await fetchCreatePage(params)
    const status = response.status
    let data: ConfluenceCreatePageResponse | undefined
    try {
      data = (await response.json()) as ConfluenceCreatePageResponse
    } catch {
      data = undefined
    }
    return {
      content: [
        {
          type: 'text',
          text: formatCreatePageResponse(status, data),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatCreatePageError(error),
        },
      ],
    }
  }
}
