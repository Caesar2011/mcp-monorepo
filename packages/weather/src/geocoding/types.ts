// Types for geocoding tool
export interface ToolInputSchema {
  name: string
}

export interface GeocodingApiResponse {
  results?: GeocodingResult[]
  generationtime_ms?: number
}

export interface GeocodingResult {
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

export interface ProcessedGeocodingResult {
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
