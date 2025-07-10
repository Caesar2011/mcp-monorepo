// Geocoding tool MCP handler
import { formatGeocodingData, formatGeocodingError } from './formatter.js'
import { fetchGeocodingData, processGeocodingData } from './helper.js'

import type { ToolInputSchema } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const geocodingHandler = async (params: ToolInputSchema): Promise<CallToolResult> => {
  const name = params.name?.trim()
  if (!name) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Location name cannot be empty.',
          _meta: { stderr: 'Empty location name' },
        },
      ],
    }
  }
  try {
    const geocodingData = await fetchGeocodingData(name)
    const processedData = processGeocodingData(geocodingData)
    const formattedText = formatGeocodingData(processedData)
    return {
      content: [
        {
          type: 'text',
          text: formattedText,
        },
      ],
    }
  } catch (error) {
    const errorText = formatGeocodingError(error, name)
    return {
      content: [
        {
          type: 'text',
          text: errorText,
          _meta: { stderr: error instanceof Error ? error.message : String(error) },
        },
      ],
    }
  }
}
