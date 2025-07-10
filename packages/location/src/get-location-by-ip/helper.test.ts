/**
 * Tests for get-location-by-ip helper functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { validateInput, fetchLocationByIp, getLocationByIpData, processLocationData } from './helper.js'
import { isValidIpAddress } from '../lib/ip-utils.js'

import type { GetLocationByIpParams, IpLocationResponse } from './types.js'

vi.mock('../lib/ip-utils.js', () => ({
  isValidIpAddress: vi.fn(),
}))

describe('Get Location By IP Helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateInput', () => {
    it('should validate correct IP address', () => {
      const params: GetLocationByIpParams = { ipAddress: '8.8.8.8' }
      vi.mocked(isValidIpAddress).mockReturnValue(true)

      const result = validateInput(params)
      expect(result).toEqual({ ipAddress: '8.8.8.8' })
      expect(isValidIpAddress).toHaveBeenCalledWith('8.8.8.8')
    })

    it('should throw error for missing IP address', () => {
      const params = { ipAddress: '' }

      expect(() => validateInput(params)).toThrow('IP address is required')
    })

    it('should throw error for invalid IP address format', () => {
      const params: GetLocationByIpParams = { ipAddress: 'not-an-ip' }
      vi.mocked(isValidIpAddress).mockReturnValue(false)

      expect(() => validateInput(params)).toThrow('Invalid IP address format: not-an-ip')
    })
  })

  describe('fetchLocationByIp', () => {
    it('should fetch location data successfully', async () => {
      const mockResponse: IpLocationResponse = {
        query: '8.8.8.8',
        status: 'success',
        country: 'United States',
        regionName: 'California',
        city: 'Mountain View',
        lat: 37.386,
        lon: -122.0838,
        timezone: 'America/Los_Angeles',
        isp: 'Google LLC',
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await fetchLocationByIp('8.8.8.8')
      expect(result).toEqual(mockResponse)
      expect(fetch).toHaveBeenCalledWith('http://ip-api.com/json/8.8.8.8?fields=61439')
    })

    it('should handle API failure status', async () => {
      const mockResponse: IpLocationResponse = {
        query: '127.0.0.1',
        status: 'fail',
        message: 'Private range',
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await expect(fetchLocationByIp('127.0.0.1')).rejects.toThrow('Private range')
    })

    it('should handle HTTP errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      await expect(fetchLocationByIp('8.8.8.8')).rejects.toThrow(
        'Failed to fetch location data: HTTP error! status: 500',
      )
    })
  })

  describe('getLocationByIpData', () => {
    it('should get location data for specific IP', async () => {
      const mockLocationResponse: IpLocationResponse = {
        query: '8.8.8.8',
        status: 'success',
        country: 'United States',
        city: 'Mountain View',
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockLocationResponse),
      })

      const validatedParams = { ipAddress: '8.8.8.8' }
      const result = await getLocationByIpData(validatedParams)

      expect(result.ipAddress).toBe('8.8.8.8')
      expect(result.location).toBe('Mountain View, United States')
    })
  })

  describe('processLocationData', () => {
    it('should process complete location data', () => {
      const input: IpLocationResponse = {
        query: '8.8.8.8',
        status: 'success',
        country: 'United States',
        regionName: 'California',
        city: 'Mountain View',
        lat: 37.386,
        lon: -122.0838,
        timezone: 'America/Los_Angeles',
        zip: '94043',
        isp: 'Google LLC',
        org: 'Google',
      }

      const result = processLocationData(input)

      expect(result).toEqual({
        ipAddress: '8.8.8.8',
        location: 'Mountain View, California, United States',
        coordinates: {
          lat: 37.386,
          lon: -122.0838,
        },
        timezone: 'America/Los_Angeles',
        zip: '94043',
        isp: 'Google LLC',
        org: 'Google',
      })
    })

    it('should handle minimal data', () => {
      const input: IpLocationResponse = {
        query: '203.0.113.1',
        status: 'success',
      }

      const result = processLocationData(input)

      expect(result).toEqual({
        ipAddress: '203.0.113.1',
        location: 'Unknown location',
      })
    })

    it('should not include org if same as isp', () => {
      const input: IpLocationResponse = {
        query: '8.8.8.8',
        status: 'success',
        isp: 'Google LLC',
        org: 'Google LLC',
      }

      const result = processLocationData(input)

      expect(result.org).toBeUndefined()
      expect(result.isp).toBe('Google LLC')
    })
  })
})
