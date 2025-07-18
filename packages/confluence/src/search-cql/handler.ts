/**
 * Handler for search-cql tool
 */
import { formatSearchCqlResponse, formatSearchCqlError } from './formatter.js'
import { fetchCqlSearch } from './helper.js'

import type { SearchCqlParams, ConfluenceSearchResponse } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const searchCqlHandler = async (params: SearchCqlParams): Promise<CallToolResult> => {
  try {
    const response = await fetchCqlSearch(params)
    const status = response.status
    let data: ConfluenceSearchResponse | undefined
    try {
      data = (await response.json()) as ConfluenceSearchResponse
    } catch {
      data = undefined
    }
    return {
      content: [
        {
          type: 'text',
          text: formatSearchCqlResponse(status, data),
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatSearchCqlError(error),
        },
      ],
    }
  }
}
