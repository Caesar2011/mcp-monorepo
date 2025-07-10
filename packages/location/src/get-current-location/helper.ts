/**
 * Business logic for get-current-location tool
 */
import { getCurrentIpAddress } from '../lib/ip-utils.js'

import type { IpLocationResponse, ProcessedLocationData } from './types.js'

// Fetch location data from IP-API service
export const fetchLocationByIp = async (ipAddress: string): Promise<IpLocationResponse> => {
  try {
    const url = `http://ip-api.com/json/${ipAddress}?fields=61439`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = (await response.json()) as IpLocationResponse

    if (data.status === 'fail') {
      throw new Error(data.message || 'Failed to fetch location data')
    }

    return data
  } catch (error) {
    throw new Error(`Failed to fetch location data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Get current location data
export const getCurrentLocationData = async (): Promise<ProcessedLocationData> => {
  const currentIp = await getCurrentIpAddress()
  const locationData = await fetchLocationByIp(currentIp)
  return processLocationData(locationData)
}

// Process raw location data into structured format
export const processLocationData = (data: IpLocationResponse): ProcessedLocationData => {
  const locationParts: string[] = []

  if (data.city) locationParts.push(data.city)
  if (data.regionName) locationParts.push(data.regionName)
  if (data.country) locationParts.push(data.country)

  const processed: ProcessedLocationData = {
    ipAddress: data.query,
    location: locationParts.join(', ') || 'Unknown location',
  }

  if (data.lat !== undefined && data.lon !== undefined) {
    processed.coordinates = {
      lat: data.lat,
      lon: data.lon,
    }
  }

  if (data.timezone) {
    processed.timezone = data.timezone
  }

  if (data.zip) {
    processed.zip = data.zip
  }

  if (data.isp) {
    processed.isp = data.isp
  }

  if (data.org && data.org !== data.isp) {
    processed.org = data.org
  }

  return processed
}
