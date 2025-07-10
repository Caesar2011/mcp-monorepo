/**
 * Output formatting for get-location-by-ip tool
 */

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
export const formatError = (error: unknown, ipAddress?: string): string => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  const context = ipAddress ? ` for IP ${ipAddress}` : ''
  return `Error getting location${context}: ${message}`
}

// Format success response with header
export const formatLocationByIpResponse = (data: ProcessedLocationData): string => {
  return `Location Information for ${data.ipAddress}:\n\n${formatLocationResponse(data)}`
}
