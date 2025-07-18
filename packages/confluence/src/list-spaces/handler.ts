/**
 * Handler for list-spaces tool
 */
import { formatListSpacesResponse, formatListSpacesError } from './formatter.js'
import { fetchListSpaces } from './helper.js'

import type { ListSpacesParams, ConfluenceSpacesResponse } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const listSpacesHandler = async (params: ListSpacesParams): Promise<CallToolResult> => {
  try {
    const response = await fetchListSpaces(params)
    const status = response.status
    let data: ConfluenceSpacesResponse | undefined
    try {
      data = (await response.json()) as ConfluenceSpacesResponse
    } catch {
      data = undefined
    }
    return {
      content: [
        {
          type: 'text',
          text: formatListSpacesResponse(status, data),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatListSpacesError(error),
        },
      ],
    }
  }
}
