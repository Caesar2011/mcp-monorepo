// Interface for IP geolocation response
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

// Get current public IP address
export const getCurrentIpAddress = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=text')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const ip = await response.text()
    return ip.trim()
  } catch (error) {
    throw new Error(`Failed to get current IP address: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

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

// Validate IP address format (basic validation)
export const isValidIpAddress = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/

  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

// Format location data for display
export const formatLocationData = (data: IpLocationResponse): string => {
  const parts: string[] = []

  if (data.city) parts.push(data.city)
  if (data.regionName) parts.push(data.regionName)
  if (data.country) parts.push(data.country)

  const location = parts.join(', ')

  let result = `IP Address: ${data.query}\n`

  if (location) {
    result += `Location: ${location}\n`
  }

  if (data.lat !== undefined && data.lon !== undefined) {
    result += `Coordinates: ${data.lat}, ${data.lon}\n`
  }

  if (data.timezone) {
    result += `Timezone: ${data.timezone}\n`
  }

  if (data.zip) {
    result += `Postal Code: ${data.zip}\n`
  }

  if (data.isp) {
    result += `ISP: ${data.isp}\n`
  }

  if (data.org && data.org !== data.isp) {
    result += `Organization: ${data.org}\n`
  }

  return result.trim()
}
