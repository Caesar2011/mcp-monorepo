import { formatEventsResponse, formatEventsError } from './formatter.js'
import { fetchCalendarEvents } from './helper.js'

import type { FetchEventsParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const toolHandler = async (params: FetchEventsParams): Promise<CallToolResult> => {
  try {
    const result = await fetchCalendarEvents(params)
    return {
      content: [
        {
          type: 'text',
          text: formatEventsResponse(result),
          _meta: { stderr: result.errors.join('\n') },
        },
      ],
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatEventsError(error),
          _meta: { stderr: error instanceof Error ? error.message : String(error) },
        },
      ],
    }
  }
}
