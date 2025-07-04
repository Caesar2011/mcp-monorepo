interface GeocodingApiResponse {
  results?: GeocodingResult[]
  generationtime_ms?: number
}

interface GeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  elevation: number
  feature_code?: string
  country_code: string
  admin1_id?: number
  admin2_id?: number
  admin3_id?: number
  admin4_id?: number
  timezone: string
  country_id?: number
  country: string
  admin1?: string
  admin2?: string
  admin3?: string
  admin4?: string
}

interface ProcessedGeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  elevation: number
  country_code: string
  timezone: string
  country: string
  admin: string[]
}

export interface ProcessedGeocodingData {
  results: ProcessedGeocodingResult[]
}

// Fetch geocoding data from Open-Meteo API
export const fetchGeocodingData = async (name: string): Promise<GeocodingApiResponse> => {
  const encodedName = encodeURIComponent(name)
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodedName}&count=10&language=en&format=json`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return data
}

// Process geocoding data by removing unwanted fields and restructuring admin data
export const processGeocodingData = (data: GeocodingApiResponse): ProcessedGeocodingData => {
  if (!data.results) {
    return { results: [] }
  }

  const processedResults = data.results.map((result) => {
    // Collect admin fields into an array
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

  return {
    results: processedResults,
  }
}

// Format geocoding data for display
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
