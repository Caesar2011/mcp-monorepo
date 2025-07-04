import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { getCurrentIpAddress, fetchLocationByIp, formatLocationData, isValidIpAddress } from './helpers.js'

// Handler for getting current location by IP address
export const getCurrentLocationHandler = async (): Promise<CallToolResult> => {
  try {
    const currentIp = await getCurrentIpAddress()
    console.log(currentIp)
    const locationData = await fetchLocationByIp(currentIp)
    const formattedData = formatLocationData(locationData)

    return {
      content: [
        {
          type: 'text',
          text: `Current Location Information:\n\n${formattedData}`,
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
          text: `Error getting current location: ${errorMessage}`,
          _meta: { stderr: errorMessage, exitCode: 1 },
        },
      ],
    }
  }
}

// Handler for getting location by specific IP address
export const getLocationByIpHandler = async ({ ipAddress }: { ipAddress: string }): Promise<CallToolResult> => {
  try {
    if (!isValidIpAddress(ipAddress)) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Invalid IP address format: ${ipAddress}`,
            _meta: { stderr: 'Invalid IP address format', exitCode: 1 },
          },
        ],
      }
    }

    const locationData = await fetchLocationByIp(ipAddress)
    const formattedData = formatLocationData(locationData)

    return {
      content: [
        {
          type: 'text',
          text: `Location Information for ${ipAddress}:\n\n${formattedData}`,
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
          text: `Error getting location for IP ${ipAddress}: ${errorMessage}`,
          _meta: { stderr: errorMessage, exitCode: 1 },
        },
      ],
    }
  }
}
