import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { fetchGeocodingData, processGeocodingData, formatGeocodingData } from './helpers.js'

// Handler for getting geocoding data by location name
export const getGeocodingHandler = async ({ name }: { name: string }): Promise<CallToolResult> => {
  try {
    if (!name || name.trim().length === 0) {
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

    const geocodingData = await fetchGeocodingData(name.trim())
    const processedData = processGeocodingData(geocodingData)
    const formattedData = formatGeocodingData(processedData)

    return {
      content: [
        {
          type: 'text',
          text: formattedData,
        },
      ],
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [
        {
          type: 'text',
          text: `Error getting geocoding data for location "${name}": ${errorMessage}`,
          _meta: { stderr: errorMessage },
        },
      ],
    }
  }
}
