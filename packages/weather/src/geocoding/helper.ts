// Geocoding tool business logic
import type { GeocodingApiResponse, ProcessedGeocodingData } from './types.js'

// Fetch geocoding data from Open-Meteo API
export const fetchGeocodingData = async (name: string): Promise<GeocodingApiResponse> => {
  const encodedName = encodeURIComponent(name)
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodedName}&count=10&language=en&format=json`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return (await response.json()) as GeocodingApiResponse
}

// Process geocoding data (structure, admins, trim fields)
export const processGeocodingData = (data: GeocodingApiResponse): ProcessedGeocodingData => {
  if (!data.results) return { results: [] }
  const processedResults = data.results.map((result) => {
    const admin: string[] = []
    if (result.admin1) admin.push(result.admin1)
    if (result.admin2) admin.push(result.admin2)
    if (result.admin3) admin.push(result.admin3)
    if (result.admin4) admin.push(result.admin4)
    return {
      id: result.id,
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      elevation: result.elevation,
      country_code: result.country_code,
      timezone: result.timezone,
      country: result.country,
      admin,
    }
  })
  return { results: processedResults }
}
