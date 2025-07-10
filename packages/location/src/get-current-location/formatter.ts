import type { ProcessedLocationData } from './types.js'

// Format location data for display
export const formatLocationResponse = (data: ProcessedLocationData): string => {
  const parts = [
    `IP Address: ${data.ipAddress}`,
    data.location && `Location: ${data.location}`,
    data.coordinates && `Coordinates: ${data.coordinates.lat}, ${data.coordinates.lon}`,
    data.timezone && `Timezone: ${data.timezone}`,
    data.zip && `Postal Code: ${data.zip}`,
    data.isp && `ISP: ${data.isp}`,
    data.org && `Organization: ${data.org}`,
  ].filter(Boolean)

  return parts.join('\n')
}

// Format error messages
export const formatError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return `Error getting current location: ${message}`
}

// Format success response with header
export const formatCurrentLocationResponse = (data: ProcessedLocationData): string => {
  return `Current Location Information:\n\n${formatLocationResponse(data)}`
}
