/**
 * Handler for get-current-location tool
 */

import { formatCurrentLocationResponse, formatError } from './formatter.js'
import { getCurrentLocationData } from './helper.js'

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const getCurrentLocationHandler = async (): Promise<CallToolResult> => {
  try {
    // Get and process location data
    const locationData = await getCurrentLocationData()

    // Format response
    const formattedResponse = formatCurrentLocationResponse(locationData)

    return {
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    }
  } catch (error) {
    const errorMessage = formatError(error)
    const errorDetails = error instanceof Error ? error.message : 'Unknown error'

    return {
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: errorDetails },
        },
      ],
    }
  }
}
