import { isValidIpAddress } from './ip-utils.js'

import type { IpLocationResponse } from './types.js'

export async function fetchIpAdress(ipAddress: string) {
  if (!isValidIpAddress(ipAddress)) {
    throw new Error(`Invalid IP address format: ${ipAddress}`)
  }
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
}
