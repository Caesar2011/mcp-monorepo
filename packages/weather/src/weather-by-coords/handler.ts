// MCP handler for weather-by-coords tool
import { formatWeatherData, formatWeatherError } from './formatter.js'
import { fetchWeatherData, processWeatherData, isValidCoordinates } from './helper.js'

import type { ToolInputSchema } from './types.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export const weatherByCoordsHandler = async (params: ToolInputSchema): Promise<CallToolResult> => {
  const { latitude, longitude } = params
  if (!isValidCoordinates(latitude, longitude)) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: Invalid coordinates. Latitude must be between -90 and 90, longitude must be between -180 and 180. Received: lat=${latitude}, lon=${longitude}`,
          _meta: { stderr: 'Invalid coordinates' },
        },
      ],
    }
  }
  try {
    const weatherData = await fetchWeatherData(latitude, longitude)
    const processedData = processWeatherData(weatherData)
    const formatted = formatWeatherData(processedData)
    return {
      content: [
        {
          type: 'text',
          text: formatted,
        },
      ],
    }
  } catch (error) {
    const errorText = formatWeatherError(error, latitude, longitude)
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
