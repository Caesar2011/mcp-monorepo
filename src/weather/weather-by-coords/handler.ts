import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { fetchWeatherData, processWeatherData, formatWeatherData, isValidCoordinates } from './helpers.js'

// Handler for getting weather by latitude and longitude
export const getWeatherHandler = async ({
  latitude,
  longitude,
}: {
  latitude: number
  longitude: number
}): Promise<CallToolResult> => {
  try {
    if (!isValidCoordinates(latitude, longitude)) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Invalid coordinates. Latitude must be between -90 and 90, longitude must be between -180 and 180. Received: lat=${latitude}, lon=${longitude}`,
            _meta: { stderr: 'Invalid coordinates', exitCode: 1 },
          },
        ],
      }
    }

    const weatherData = await fetchWeatherData(latitude, longitude)
    const processedData = processWeatherData(weatherData)
    const formattedData = formatWeatherData(processedData)

    return {
      content: [
        {
          type: 'text',
          text: formattedData,
          _meta: { stderr: '', exitCode: 0 },
        },
      ],
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [
        {
          type: 'text',
          text: `Error getting weather data for coordinates ${latitude}, ${longitude}: ${errorMessage}`,
          _meta: { stderr: errorMessage, exitCode: 1 },
        },
      ],
    }
  }
}
