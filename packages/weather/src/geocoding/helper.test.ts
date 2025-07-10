// Helper and formatter test for geocoding tool
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { formatGeocodingData } from './formatter.js'
import { fetchGeocodingData, processGeocodingData } from './helper.js'

import type { ProcessedGeocodingData } from './types.js'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Geocoding Helper & Formatter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchGeocodingData', () => {
    it('fetches geocoding data', async () => {
      const mockResponse = {
        results: [
          {
            id: 1,
            name: 'A',
            latitude: 1,
            longitude: 2,
            elevation: 3,
            country_code: 'US',
            timezone: 'Tz',
            country: 'C',
            admin1: 'A1',
          },
        ],
        generationtime_ms: 1,
      }
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse })
      const result = await fetchGeocodingData('A')
      expect(result).toEqual(mockResponse)
    })
    it('encodes special chars', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) })
      await fetchGeocodingData('São Paulo')
      expect(mockFetch).toHaveBeenCalled()
      const [calledUrl] = mockFetch.mock.calls[0]
      expect(calledUrl).toContain('S%C3%A3o%20Paulo')
    })
    it('throws on http error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
      await expect(fetchGeocodingData('B')).rejects.toThrow('HTTP error! status: 404')
    })
    it('throws on fetch fail', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fail'))
      await expect(fetchGeocodingData('C')).rejects.toThrow('fail')
    })
  })

  describe('processGeocodingData', () => {
    it('processes as expected', () => {
      const input = {
        results: [
          {
            id: 1,
            name: 'N',
            latitude: 1,
            longitude: 2,
            elevation: 3,
            country_code: 'US',
            timezone: 'Tz',
            country: 'C',
            admin1: 'A1',
            admin2: 'A2',
          },
        ],
      }
      expect(processGeocodingData(input)).toEqual({
        results: [
          {
            id: 1,
            name: 'N',
            latitude: 1,
            longitude: 2,
            elevation: 3,
            country_code: 'US',
            timezone: 'Tz',
            country: 'C',
            admin: ['A1', 'A2'],
          },
        ],
      })
    })
    it('handles empty/missing results', () => {
      expect(processGeocodingData({ results: [] })).toEqual({ results: [] })
      expect(processGeocodingData({})).toEqual({ results: [] })
    })
    it('handles all admin levels', () => {
      const input = {
        results: [
          {
            id: 2,
            name: 'X',
            latitude: 0,
            longitude: 0,
            elevation: 0,
            country_code: 'X',
            timezone: 'TZ',
            country: 'XXX',
            admin1: 'A',
            admin2: 'B',
            admin3: 'C',
            admin4: 'D',
          },
        ],
      }
      expect(processGeocodingData(input).results[0].admin).toEqual(['A', 'B', 'C', 'D'])
    })
  })

  describe('formatGeocodingData', () => {
    it('formats properly', () => {
      const input: ProcessedGeocodingData = {
        results: [
          {
            id: 9,
            name: 'Name',
            latitude: 1,
            longitude: 2,
            elevation: 3,
            country_code: 'X',
            timezone: 'Z',
            country: 'C',
            admin: ['A', 'B'],
          },
        ],
      }
      const out = formatGeocodingData(input)
      expect(out).toContain('1. Name')
      expect(out).toContain('Coordinates: 1°, 2°')
      expect(out).toContain('Administrative areas: A, B')
    })
    it('handles no results', () => {
      expect(formatGeocodingData({ results: [] })).toBe('No locations found.')
      expect(formatGeocodingData({} as unknown as ProcessedGeocodingData)).toBe('No locations found.')
    })
    it('formats admin N/A', () => {
      const input: ProcessedGeocodingData = {
        results: [
          {
            id: 1,
            name: 'NoAdmins',
            latitude: 1,
            longitude: 2,
            elevation: 1,
            country_code: 'C',
            timezone: 'T',
            country: 'C',
            admin: [],
          },
        ],
      }
      expect(formatGeocodingData(input)).toContain('Administrative areas: N/A')
    })
  })
})
