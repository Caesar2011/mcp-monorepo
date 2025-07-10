import { describe, it, expect } from 'vitest'

import { formatLocationResponse, formatError, formatLocationByIpResponse } from './formatter.js'

import type { ProcessedLocationData } from './types.js'

describe('get-location-by-ip formatter', () => {
  describe('formatLocationResponse', () => {
    it('should format complete location data', () => {
      const data: ProcessedLocationData = {
        ipAddress: '8.8.8.8',
        location: 'Mountain View, California, United States',
        coordinates: { lat: 37.386, lon: -122.0838 },
        timezone: 'America/Los_Angeles',
        zip: '94035',
        isp: 'Google LLC',
        org: 'Google Public DNS',
      }

      const result = formatLocationResponse(data)

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

    it('should format minimal location data', () => {
      const data: ProcessedLocationData = {
        ipAddress: '127.0.0.1',
        location: 'Berlin, Germany',
      }

      const result = formatLocationResponse(data)

      expect(result).toBe('IP Address: 127.0.0.1\nLocation: Berlin, Germany')
    })

    it('should skip undefined fields', () => {
      const data: ProcessedLocationData = {
        ipAddress: '1.1.1.1',
        location: 'Sydney, Australia',
        isp: 'Cloudflare, Inc.',
      }

      const result = formatLocationResponse(data)

      expect(result).toBe('IP Address: 1.1.1.1\n' + 'Location: Sydney, Australia\n' + 'ISP: Cloudflare, Inc.')
    })
  })

  describe('formatError', () => {
    it('should format Error instances without IP context', () => {
      const error = new Error('Network timeout')
      const result = formatError(error)
      expect(result).toBe('Error getting location: Network timeout')
    })

    it('should format Error instances with IP context', () => {
      const error = new Error('Invalid IP address')
      const result = formatError(error, '8.8.8.8')
      expect(result).toBe('Error getting location for IP 8.8.8.8: Invalid IP address')
    })

    it('should handle non-Error exceptions', () => {
      const result = formatError('String error', '1.1.1.1')
      expect(result).toBe('Error getting location for IP 1.1.1.1: Unknown error')
    })

    it('should handle null/undefined errors', () => {
      expect(formatError(undefined)).toBe('Error getting location: Unknown error')
      expect(formatError(undefined, '8.8.8.8')).toBe('Error getting location for IP 8.8.8.8: Unknown error')
    })
  })

  describe('formatLocationByIpResponse', () => {
    it('should format response with IP-specific header', () => {
      const data: ProcessedLocationData = {
        ipAddress: '8.8.8.8',
        location: 'Mountain View, California',
      }

      const result = formatLocationByIpResponse(data)

      expect(result).toBe(
        'Location Information for 8.8.8.8:\n\n' + 'IP Address: 8.8.8.8\n' + 'Location: Mountain View, California',
      )
    })
  })
})
