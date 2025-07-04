import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getGeocodingHandler } from './handler.js'
import * as helpers from './helpers.js'

// Mock the helpers module
vi.mock('./helpers.js')

const mockFetchGeocodingData = vi.mocked(helpers.fetchGeocodingData)
const mockProcessGeocodingData = vi.mocked(helpers.processGeocodingData)
const mockFormatGeocodingData = vi.mocked(helpers.formatGeocodingData)

describe('Geocoding Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getGeocodingHandler', () => {
    it('should handle valid location name successfully', async () => {
      const mockApiResponse = {
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

      const mockProcessedData = {
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

      const mockFormattedData = `Found 1 location(s):

1. Trzebina
 Country: Poland (PL)
 Coordinates: 51.42629°, 20.36538°
 Elevation: 180m
 Administrative areas: Łódź Voivodeship, Opoczno County, Gmina Drzewica
 Timezone: Europe/Warsaw
 ID: 756691`

      mockFetchGeocodingData.mockResolvedValue(mockApiResponse)
      mockProcessGeocodingData.mockReturnValue(mockProcessedData)
      mockFormatGeocodingData.mockReturnValue(mockFormattedData)

      const result = await getGeocodingHandler({ name: 'Trzebina' })

      expect(mockFetchGeocodingData).toHaveBeenCalledWith('Trzebina')
      expect(mockProcessGeocodingData).toHaveBeenCalledWith(mockApiResponse)
      expect(mockFormatGeocodingData).toHaveBeenCalledWith(mockProcessedData)

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: mockFormattedData,
            _meta: { stderr: '', exitCode: 0 },
          },
        ],
      })
    })

    it('should handle location name with whitespace', async () => {
      const mockApiResponse = { results: [] }
      const mockProcessedData = { results: [] }
      const mockFormattedData = 'No locations found.'

      mockFetchGeocodingData.mockResolvedValue(mockApiResponse)
      mockProcessGeocodingData.mockReturnValue(mockProcessedData)
      mockFormatGeocodingData.mockReturnValue(mockFormattedData)

      const result = await getGeocodingHandler({ name: ' New York ' })

      expect(mockFetchGeocodingData).toHaveBeenCalledWith('New York')
      expect(result.content?.[0]?._meta?.exitCode).toBe(0)
    })

    it('should handle empty location name', async () => {
      const result = await getGeocodingHandler({ name: '' })

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Location name cannot be empty.',
            _meta: { stderr: 'Empty location name', exitCode: 1 },
          },
        ],
      })

      expect(mockFetchGeocodingData).not.toHaveBeenCalled()
    })

    it('should handle whitespace-only location name', async () => {
      const result = await getGeocodingHandler({ name: ' ' })

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Location name cannot be empty.',
            _meta: { stderr: 'Empty location name', exitCode: 1 },
          },
        ],
      })

      expect(mockFetchGeocodingData).not.toHaveBeenCalled()
    })

    it('should handle API fetch error', async () => {
      const errorMessage = 'API request failed'
      mockFetchGeocodingData.mockRejectedValue(new Error(errorMessage))

      const result = await getGeocodingHandler({ name: 'TestCity' })

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error getting geocoding data for location "TestCity": API request failed',
            _meta: { stderr: 'API request failed', exitCode: 1 },
          },
        ],
      })
    })

    it('should handle unknown error type', async () => {
      mockFetchGeocodingData.mockRejectedValue('String error')

      const result = await getGeocodingHandler({ name: 'TestCity' })

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error getting geocoding data for location "TestCity": Unknown error',
            _meta: { stderr: 'Unknown error', exitCode: 1 },
          },
        ],
      })
    })

    it('should handle processing error', async () => {
      const mockApiResponse = { results: [] }
      mockFetchGeocodingData.mockResolvedValue(mockApiResponse)
      mockProcessGeocodingData.mockImplementation(() => {
        throw new Error('Processing failed')
      })

      const result = await getGeocodingHandler({ name: 'TestCity' })

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error getting geocoding data for location "TestCity": Processing failed',
            _meta: { stderr: 'Processing failed', exitCode: 1 },
          },
        ],
      })
    })

    it('should handle formatting error', async () => {
      const mockApiResponse = { results: [] }
      const mockProcessedData = { results: [] }
      mockFetchGeocodingData.mockResolvedValue(mockApiResponse)
      mockProcessGeocodingData.mockReturnValue(mockProcessedData)
      mockFormatGeocodingData.mockImplementation(() => {
        throw new Error('Formatting failed')
      })

      const result = await getGeocodingHandler({ name: 'TestCity' })

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error getting geocoding data for location "TestCity": Formatting failed',
            _meta: { stderr: 'Formatting failed', exitCode: 1 },
          },
        ],
      })
    })

    it('should handle multiple location results', async () => {
      const mockApiResponse = {
        results: [
          {
            id: 1,
            name: 'Paris',
            latitude: 48.8566,
            longitude: 2.3522,
            elevation: 35.0,
            country_code: 'FR',
            timezone: 'Europe/Paris',
            country: 'France',
            admin1: 'Île-de-France',
          },
          {
            id: 2,
            name: 'Paris',
            latitude: 36.3021,
            longitude: -88.3267,
            elevation: 125.0,
            country_code: 'US',
            timezone: 'America/Chicago',
            country: 'United States',
            admin1: 'Tennessee',
          },
        ],
      }

      const mockProcessedData = {
        results: [
          {
            id: 1,
            name: 'Paris',
            latitude: 48.8566,
            longitude: 2.3522,
            elevation: 35.0,
            country_code: 'FR',
            timezone: 'Europe/Paris',
            country: 'France',
            admin: ['Île-de-France'],
          },
          {
            id: 2,
            name: 'Paris',
            latitude: 36.3021,
            longitude: -88.3267,
            elevation: 125.0,
            country_code: 'US',
            timezone: 'America/Chicago',
            country: 'United States',
            admin: ['Tennessee'],
          },
        ],
      }

      const mockFormattedData = `Found 2 location(s):

1. Paris
 Country: France (FR)
 Coordinates: 48.8566°, 2.3522°
 Elevation: 35m
 Administrative areas: Île-de-France
 Timezone: Europe/Paris
 ID: 1

2. Paris
 Country: United States (US)
 Coordinates: 36.3021°, -88.3267°
 Elevation: 125m
 Administrative areas: Tennessee
 Timezone: America/Chicago
 ID: 2`

      mockFetchGeocodingData.mockResolvedValue(mockApiResponse)
      mockProcessGeocodingData.mockReturnValue(mockProcessedData)
      mockFormatGeocodingData.mockReturnValue(mockFormattedData)

      const result = await getGeocodingHandler({ name: 'Paris' })

      expect(result.content?.[0]?.text).toBe(mockFormattedData)
      expect(result.content?.[0]?._meta?.exitCode).toBe(0)
    })
  })
})
