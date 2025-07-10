/**
 * Tests for get-current-location helper functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { fetchLocationByIp, getCurrentLocationData, processLocationData } from './helper.js'
import { getCurrentIpAddress } from '../lib/ip-utils.js'

import type { IpLocationResponse } from './types.js'

vi.mock('../lib/ip-utils.js', () => ({
  getCurrentIpAddress: vi.fn(),
}))

describe('Get Current Location Helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  describe('getCurrentLocationData', () => {
    it('should get current location data', async () => {
      const mockIp = '203.0.113.1'
      const mockLocationResponse: IpLocationResponse = {
        query: mockIp,
        status: 'success',
        country: 'United States',
        city: 'New York',
      }

      vi.mocked(getCurrentIpAddress).mockResolvedValue(mockIp)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockLocationResponse),
      })

      const result = await getCurrentLocationData()
      expect(result.ipAddress).toBe(mockIp)
      expect(result.location).toBe('New York, United States')
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
        query: '8.8.8.8',
        status: 'success',
      }

      const result = processLocationData(input)

      expect(result).toEqual({
        ipAddress: '8.8.8.8',
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
