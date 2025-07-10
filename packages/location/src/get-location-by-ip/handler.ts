/**
 * Handler for get-location-by-ip tool
 */

import { formatLocationByIpResponse, formatError } from './formatter.js'
import { validateInput, getLocationByIpData } from './helper.js'

import type { GetLocationByIpParams } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const getLocationByIpHandler = async (params: GetLocationByIpParams): Promise<CallToolResult> => {
  try {
    // Validate input
    const validatedParams = validateInput(params)

    // Get and process location data
    const locationData = await getLocationByIpData(validatedParams)

    // Format response
    const formattedResponse = formatLocationByIpResponse(locationData)

    return {
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    }
  } catch (error) {
    const errorMessage = formatError(error, params.ipAddress)
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
