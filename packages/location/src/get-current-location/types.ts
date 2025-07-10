/**
 * Type definitions for get-current-location tool
 */

// Input types (no parameters for current location)
export type GetCurrentLocationParams = Record<string, never>

// External API response from IP-API service
export interface IpLocationResponse {
  query: string
  status: 'success' | 'fail'
  country?: string
  countryCode?: string
  region?: string
  regionName?: string
  city?: string
  zip?: string
  lat?: number
  lon?: number
  timezone?: string
  isp?: string
  org?: string
  as?: string
  message?: string // Error message when status is 'fail'
}

// Processed data type
export interface ProcessedLocationData {
  ipAddress: string
  location: string
  coordinates?: {
    lat: number
    lon: number
  }
  timezone?: string
  zip?: string
  isp?: string
  org?: string
}
