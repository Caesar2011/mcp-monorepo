/**
 * Generic IP address utilities that can be used across multiple MCPs
 */

// Validate IP address format (IPv4 and IPv6)
export const isValidIpAddress = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/

  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
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
