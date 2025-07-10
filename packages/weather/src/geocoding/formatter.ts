// Geocoding tool formatter
import type { ProcessedGeocodingData } from './types.js'

export const formatGeocodingData = (data: ProcessedGeocodingData): string => {
  if (!data.results || data.results.length === 0) {
    return 'No locations found.'
  }
  const resultLines = data.results.map((result, index) => {
    const adminInfo = result.admin.length > 0 ? result.admin.join(', ') : 'N/A'
    return [
      `${index + 1}. ${result.name}`,
      ` Country: ${result.country} (${result.country_code})`,
      ` Coordinates: ${result.latitude}°, ${result.longitude}°`,
      ` Elevation: ${result.elevation}m`,
      ` Administrative areas: ${adminInfo}`,
      ` Timezone: ${result.timezone}`,
      ` ID: ${result.id}`,
    ].join('\n')
  })
  return [`Found ${data.results.length} location(s):\n`, ...resultLines].join('\n\n')
}

export const formatGeocodingError = (error: unknown, name?: string): string => {
  const base = name ? `Error getting geocoding data for location "${name}": ` : 'Error: '
  if (error instanceof Error) return base + error.message
  if (typeof error === 'string') return base + error
  return base + 'Unknown error.'
}
