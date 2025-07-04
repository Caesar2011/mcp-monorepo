import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCurrentIpAddress,
  fetchLocationByIp,
  isValidIpAddress,
  formatLocationData,
  type IpLocationResponse,
} from './helpers.js'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('Location Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCurrentIpAddress', () => {
    it('should return trimmed IP address on success', async () => {
      // Arrange
      const mockIp = '192.168.1.1'
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue(`  ${mockIp}  `),
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Act
      const result = await getCurrentIpAddress()

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('https://api.ipify.org?format=text')
      expect(mockResponse.text).toHaveBeenCalledOnce()
      expect(result).toBe(mockIp)
    })

    it('should throw error when HTTP response is not ok', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 404,
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Act & Assert
      await expect(getCurrentIpAddress()).rejects.toThrow('Failed to get current IP address: HTTP error! status: 404')
    })

    it('should throw error when fetch fails', async () => {
      // Arrange
      const networkError = new Error('Network error')
      mockFetch.mockRejectedValue(networkError)

      // Act & Assert
      await expect(getCurrentIpAddress()).rejects.toThrow('Failed to get current IP address: Network error')
    })

    it('should throw error when response.text() fails', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        text: vi.fn().mockRejectedValue(new Error('Text parsing failed')),
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Act & Assert
      await expect(getCurrentIpAddress()).rejects.toThrow('Failed to get current IP address: Text parsing failed')
    })

    it('should handle non-Error exceptions', async () => {
      // Arrange
      mockFetch.mockRejectedValue('String error')

      // Act & Assert
      await expect(getCurrentIpAddress()).rejects.toThrow('Failed to get current IP address: Unknown error')
    })
  })

  describe('fetchLocationByIp', () => {
    const mockSuccessResponse: IpLocationResponse = {
      query: '8.8.8.8',
      status: 'success',
      country: 'United States',
      countryCode: 'US',
      region: 'CA',
      regionName: 'California',
      city: 'Mountain View',
      zip: '94035',
      lat: 37.386,
      lon: -122.0838,
      timezone: 'America/Los_Angeles',
      isp: 'Google LLC',
      org: 'Google Public DNS',
      as: 'AS15169 Google LLC',
    }

    it('should return location data on success', async () => {
      // Arrange
      const ipAddress = '8.8.8.8'
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockSuccessResponse),
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Act
      const result = await fetchLocationByIp(ipAddress)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(`http://ip-api.com/json/${ipAddress}?fields=61439`)
      expect(mockResponse.json).toHaveBeenCalledOnce()
      expect(result).toEqual(mockSuccessResponse)
    })

    it('should throw error when HTTP response is not ok', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 500,
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Act & Assert
      await expect(fetchLocationByIp('8.8.8.8')).rejects.toThrow(
        'Failed to fetch location data: HTTP error! status: 500',
      )
    })

    it('should throw error when API returns fail status with message', async () => {
      // Arrange
      const failResponse: IpLocationResponse = {
        query: '192.168.1.1',
        status: 'fail',
        message: 'private range',
      }
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(failResponse),
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Act & Assert
      await expect(fetchLocationByIp('192.168.1.1')).rejects.toThrow('Failed to fetch location data: private range')
    })

    it('should throw error when API returns fail status without message', async () => {
      // Arrange
      const failResponse: IpLocationResponse = {
        query: '127.0.0.1',
        status: 'fail',
      }
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(failResponse),
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Act & Assert
      await expect(fetchLocationByIp('127.0.0.1')).rejects.toThrow(
        'Failed to fetch location data: Failed to fetch location data',
      )
    })

    it('should throw error when JSON parsing fails', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Act & Assert
      await expect(fetchLocationByIp('8.8.8.8')).rejects.toThrow('Failed to fetch location data: Invalid JSON')
    })

    it('should handle non-Error exceptions', async () => {
      // Arrange
      mockFetch.mockRejectedValue(null)

      // Act & Assert
      await expect(fetchLocationByIp('8.8.8.8')).rejects.toThrow('Failed to fetch location data: Unknown error')
    })
  })

  describe('isValidIpAddress', () => {
    describe('IPv4 addresses', () => {
      it.each(['0.0.0.0', '127.0.0.1', '192.168.1.1', '255.255.255.255', '8.8.8.8', '1.2.3.4', '10.0.0.1'])(
        'should validate correct IPv4 address: %s',
        (ip) => {
          expect(isValidIpAddress(ip)).toBe(true)
        },
      )

      it.each([
        '256.1.1.1',
        '1.256.1.1',
        '1.1.256.1',
        '1.1.1.256',
        '999.999.999.999',
        '192.168.1',
        '192.168.1.1.1',
        '192.168.1.1.',
        '.192.168.1.1',
        '192..168.1.1',
        'a.b.c.d',
      ])('should reject invalid IPv4 address: %s', (ip) => {
        expect(isValidIpAddress(ip)).toBe(false)
      })
    })

    describe('IPv6 addresses', () => {
      it.each([
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        '2001:db8:85a3:0:0:8a2e:370:7334',
        '2001:0db8:0000:0000:0000:0000:0000:0001',
      ])('should validate correct IPv6 address: %s', (ip) => {
        expect(isValidIpAddress(ip), 'should validate correct IPv6 address:' + ip).toBe(true)
      })

      it.each([
        '2001:0db8:85a3::8a2e:370g:7334',
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334:extra',
        '2001:0db8:85a3',
        ':::1',
        'fe80:::1',
        '2001:0db8::85a3::7334',
      ])('should reject invalid IPv6 address: %s', (ip) => {
        expect(isValidIpAddress(ip)).toBe(false)
      })
    })

    describe('Edge cases', () => {
      it.each([
        '',
        ' ',
        'not-an-ip',
        'localhost',
        '192.168.1.1 ',
        ' 192.168.1.1',
        'http://192.168.1.1',
        '192.168.1.1/24',
      ])('should reject invalid input: %s', (input) => {
        expect(isValidIpAddress(input)).toBe(false)
      })
    })
  })

  describe('formatLocationData', () => {
    it('should format complete location data', () => {
      // Arrange
      const data: IpLocationResponse = {
        query: '8.8.8.8',
        status: 'success',
        country: 'United States',
        countryCode: 'US',
        region: 'CA',
        regionName: 'California',
        city: 'Mountain View',
        zip: '94035',
        lat: 37.386,
        lon: -122.0838,
        timezone: 'America/Los_Angeles',
        isp: 'Google LLC',
        org: 'Google Public DNS',
        as: 'AS15169 Google LLC',
      }

      // Act
      const result = formatLocationData(data)

      // Assert
      expect(result).toBe(
        'IP Address: 8.8.8.8\n' +
          'Location: Mountain View, California, United States\n' +
          'Coordinates: 37.386, -122.0838\n' +
          'Timezone: America/Los_Angeles\n' +
          'Postal Code: 94035\n' +
          'ISP: Google LLC\n' +
          'Organization: Google Public DNS',
      )
    })

    it('should format partial location data', () => {
      // Arrange
      const data: IpLocationResponse = {
        query: '1.1.1.1',
        status: 'success',
        country: 'Australia',
        city: 'Sydney',
        isp: 'Cloudflare, Inc.',
      }

      // Act
      const result = formatLocationData(data)

      // Assert
      expect(result).toBe('IP Address: 1.1.1.1\n' + 'Location: Sydney, Australia\n' + 'ISP: Cloudflare, Inc.')
    })

    it('should format minimal location data', () => {
      // Arrange
      const data: IpLocationResponse = {
        query: '127.0.0.1',
        status: 'success',
      }

      // Act
      const result = formatLocationData(data)

      // Assert
      expect(result).toBe('IP Address: 127.0.0.1')
    })

    it('should handle same ISP and organization', () => {
      // Arrange
      const data: IpLocationResponse = {
        query: '8.8.8.8',
        status: 'success',
        isp: 'Google LLC',
        org: 'Google LLC',
      }

      // Act
      const result = formatLocationData(data)

      // Assert
      expect(result).toBe('IP Address: 8.8.8.8\n' + 'ISP: Google LLC')
      expect(result).not.toContain('Organization:')
    })

    it('should handle zero coordinates', () => {
      // Arrange
      const data: IpLocationResponse = {
        query: '0.0.0.0',
        status: 'success',
        lat: 0,
        lon: 0,
      }

      // Act
      const result = formatLocationData(data)

      // Assert
      expect(result).toContain('Coordinates: 0, 0')
    })

    it.each([
      {
        scenario: 'lat is undefined',
        data: { query: '1.2.3.4', status: 'success' as const, lon: -122.0838 },
      },
      {
        scenario: 'lon is undefined',
        data: { query: '1.2.3.4', status: 'success' as const, lat: 37.386 },
      },
    ])('should skip coordinates when $scenario', ({ data }) => {
      // Act
      const result = formatLocationData(data)

      // Assert
      expect(result).not.toContain('Coordinates:')
    })

    it('should handle empty string values', () => {
      // Arrange
      const data: IpLocationResponse = {
        query: '1.2.3.4',
        status: 'success',
        city: '',
        country: 'United States',
        regionName: '',
        zip: '',
        timezone: '',
        isp: '',
        org: '',
      }

      // Act
      const result = formatLocationData(data)

      // Assert
      expect(result).toBe('IP Address: 1.2.3.4\n' + 'Location: United States')
    })
  })
})
