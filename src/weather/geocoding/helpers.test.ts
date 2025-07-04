import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchGeocodingData, processGeocodingData, formatGeocodingData, ProcessedGeocodingData } from './helpers.js'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Geocoding Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchGeocodingData', () => {
    it('should fetch geocoding data successfully', async () => {
      const mockResponse = {
        results: [
          {
            id: 756691,
            name: 'Trzebina',
            latitude: 51.42629,
            longitude: 20.36538,
            elevation: 180.0,
            feature_code: 'PPL',
            country_code: 'PL',
            admin1_id: 3337493,
            admin2_id: 7531020,
            admin3_id: 7532977,
            timezone: 'Europe/Warsaw',
            country_id: 798544,
            country: 'Poland',
            admin1: 'Łódź Voivodeship',
            admin2: 'Opoczno County',
            admin3: 'Gmina Drzewica',
          },
        ],
        generationtime_ms: 0.3117323,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await fetchGeocodingData('Trzebina')
      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://geocoding-api.open-meteo.com/v1/search?name=Trzebina&count=10&language=en&format=json',
      )
    })

    it('should handle special characters in location names', async () => {
      const mockResponse = { results: [] }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      await fetchGeocodingData('São Paulo')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://geocoding-api.open-meteo.com/v1/search?name=S%C3%A3o%20Paulo&count=10&language=en&format=json',
      )
    })

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      await expect(fetchGeocodingData('TestLocation')).rejects.toThrow('HTTP error! status: 500')
    })

    it('should throw error on fetch failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchGeocodingData('TestLocation')).rejects.toThrow('Network error')
    })
  })

  describe('processGeocodingData', () => {
    it('should process geocoding data correctly', () => {
      const input = {
        results: [
          {
            id: 756691,
            name: 'Trzebina',
            latitude: 51.42629,
            longitude: 20.36538,
            elevation: 180.0,
            feature_code: 'PPL',
            country_code: 'PL',
            admin1_id: 3337493,
            admin2_id: 7531020,
            admin3_id: 7532977,
            timezone: 'Europe/Warsaw',
            country_id: 798544,
            country: 'Poland',
            admin1: 'Łódź Voivodeship',
            admin2: 'Opoczno County',
            admin3: 'Gmina Drzewica',
          },
        ],
        generationtime_ms: 0.3117323,
      }

      const result = processGeocodingData(input)

      expect(result).toEqual({
        results: [
          {
            id: 756691,
            name: 'Trzebina',
            latitude: 51.42629,
            longitude: 20.36538,
            elevation: 180.0,
            country_code: 'PL',
            timezone: 'Europe/Warsaw',
            country: 'Poland',
            admin: ['Łódź Voivodeship', 'Opoczno County', 'Gmina Drzewica'],
          },
        ],
      })
    })

    it('should handle missing admin fields', () => {
      const input = {
        results: [
          {
            id: 123,
            name: 'Test City',
            latitude: 40.0,
            longitude: -74.0,
            elevation: 10.0,
            country_code: 'US',
            timezone: 'America/New_York',
            country: 'United States',
            admin1: 'New York',
            // admin2, admin3, admin4 missing
          },
        ],
      }

      const result = processGeocodingData(input)

      expect(result.results?.[0]?.admin).toEqual(['New York'])
    })

    it('should handle empty results', () => {
      const input = { results: [] }
      const result = processGeocodingData(input)
      expect(result).toEqual({ results: [] })
    })

    it('should handle missing results', () => {
      const input = {}
      const result = processGeocodingData(input)
      expect(result).toEqual({ results: [] })
    })

    it('should handle all four admin levels', () => {
      const input = {
        results: [
          {
            id: 123,
            name: 'Test City',
            latitude: 40.0,
            longitude: -74.0,
            elevation: 10.0,
            country_code: 'US',
            timezone: 'America/New_York',
            country: 'United States',
            admin1: 'State',
            admin2: 'County',
            admin3: 'District',
            admin4: 'Subdivision',
          },
        ],
      }

      const result = processGeocodingData(input)
      expect(result.results?.[0]?.admin).toEqual(['State', 'County', 'District', 'Subdivision'])
    })
  })

  describe('formatGeocodingData', () => {
    it('should format geocoding data correctly', () => {
      const input = {
        results: [
          {
            id: 756691,
            name: 'Trzebina',
            latitude: 51.42629,
            longitude: 20.36538,
            elevation: 180.0,
            country_code: 'PL',
            timezone: 'Europe/Warsaw',
            country: 'Poland',
            admin: ['Łódź Voivodeship', 'Opoczno County', 'Gmina Drzewica'],
          },
        ],
      }

      const result = formatGeocodingData(input)
      const expectedOutput = `Found 1 location(s):


1. Trzebina
 Country: Poland (PL)
 Coordinates: 51.42629°, 20.36538°
 Elevation: 180m
 Administrative areas: Łódź Voivodeship, Opoczno County, Gmina Drzewica
 Timezone: Europe/Warsaw
 ID: 756691`

      expect(result).toBe(expectedOutput)
    })

    it('should format multiple results correctly', () => {
      const input = {
        results: [
          {
            id: 1,
            name: 'City A',
            latitude: 40.0,
            longitude: -74.0,
            elevation: 10.0,
            country_code: 'US',
            timezone: 'America/New_York',
            country: 'United States',
            admin: ['New York'],
          },
          {
            id: 2,
            name: 'City B',
            latitude: 51.5,
            longitude: -0.1,
            elevation: 25.0,
            country_code: 'GB',
            timezone: 'Europe/London',
            country: 'United Kingdom',
            admin: [],
          },
        ],
      }

      const result = formatGeocodingData(input)
      expect(result).toContain('Found 2 location(s):')
      expect(result).toContain('1. City A')
      expect(result).toContain('2. City B')
      expect(result).toContain('Administrative areas: New York')
      expect(result).toContain('Administrative areas: N/A')
    })

    it('should handle empty results', () => {
      const input = { results: [] }
      const result = formatGeocodingData(input)
      expect(result).toBe('No locations found.')
    })

    it('should handle missing results', () => {
      const input = {}
      const result = formatGeocodingData(input as ProcessedGeocodingData)
      expect(result).toBe('No locations found.')
    })
  })
})
