import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchWeatherData,
  processWeatherData,
  formatWeatherData,
  isValidCoordinates,
  formatSunshineDuration,
  formatPrecipitationCombined,
  type WeatherApiResponse,
  type ProcessedWeatherData,
} from './helpers.js'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('Weather Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('formatSunshineDuration', () => {
    it('should format seconds to hours and minutes correctly', () => {
      expect(formatSunshineDuration(0)).toBe('0m')
      expect(formatSunshineDuration(60)).toBe('1m')
      expect(formatSunshineDuration(3600)).toBe('1h')
      expect(formatSunshineDuration(3660)).toBe('1h 1m')
      expect(formatSunshineDuration(7200)).toBe('2h')
      expect(formatSunshineDuration(7320)).toBe('2h 2m')
      expect(formatSunshineDuration(47349.81)).toBe('13h 9m')
    })

    it('should handle fractional seconds', () => {
      expect(formatSunshineDuration(3659.9)).toBe('1h')
      expect(formatSunshineDuration(3601.5)).toBe('1h')
    })
  })

  describe('formatPrecipitationCombined', () => {
    it('should combine precipitation amount and probability', () => {
      expect(formatPrecipitationCombined(0, 0, 'mm', '%')).toBe('0mm (0%)')
      expect(formatPrecipitationCombined(20, 70, 'mm', '%')).toBe('20mm (70%)')
      expect(formatPrecipitationCombined(0.5, 25, 'mm', '%')).toBe('0.5mm (25%)')
    })
  })

  describe('isValidCoordinates', () => {
    it.each([
      [0, 0],
      [90, 180],
      [-90, -180],
      [52.52, 13.41],
      [37.7749, -122.4194],
      [-33.8688, 151.2093],
    ])('should validate correct coordinates: lat=%d, lon=%d', (lat, lon) => {
      expect(isValidCoordinates(lat, lon)).toBe(true)
    })

    it.each([
      [91, 0, 'latitude too high'],
      [-91, 0, 'latitude too low'],
      [0, 181, 'longitude too high'],
      [0, -181, 'longitude too low'],
      [NaN, 0, 'latitude is NaN'],
      [0, NaN, 'longitude is NaN'],
      [Infinity, 0, 'latitude is Infinity'],
      [0, Infinity, 'longitude is Infinity'],
    ])('should reject invalid coordinates: lat=%d, lon=%d (%s)', (lat, lon) => {
      expect(isValidCoordinates(lat, lon)).toBe(false)
    })

    it.each([
      ['52.52', 13.41],
      [52.52, '13.41'],
      [null, 13.41],
      [52.52, null],
      [undefined, 13.41],
      [52.52, undefined],
    ])('should reject non-number types: lat=%s, lon=%s', (lat, lon) => {
      expect(isValidCoordinates(lat as unknown as number, lon as unknown as number)).toBe(false)
    })
  })

  describe('fetchWeatherData', () => {
    const mockWeatherResponse: WeatherApiResponse = {
      latitude: 52.52,
      longitude: 13.419998,
      generationtime_ms: 63.33315372467041,
      utc_offset_seconds: 7200,
      timezone: 'Europe/Berlin',
      timezone_abbreviation: 'GMT+2',
      elevation: 38.0,
      hourly_units: {
        time: 'iso8601',
        temperature_2m: '°C',
        wind_speed_10m: 'km/h',
        precipitation_probability: '%',
        precipitation: 'mm',
        apparent_temperature: '°C',
        dew_point_2m: '°C',
      },
      hourly: {
        time: ['2025-07-04T16:00', '2025-07-04T19:00'],
        temperature_2m: [23.1, 23.4],
        wind_speed_10m: [6.4, 7.2],
        precipitation_probability: [0, 0],
        precipitation: [0.0, 0.0],
        apparent_temperature: [21.9, 21.0],
        dew_point_2m: [3.6, 3.9],
      },
      daily_units: {
        time: 'iso8601',
        sunrise: 'iso8601',
        sunset: 'iso8601',
        temperature_2m_max: '°C',
        precipitation_probability_max: '%',
        precipitation_sum: 'mm',
        sunshine_duration: 's',
        temperature_2m_min: '°C',
      },
      daily: {
        time: ['2025-07-04', '2025-07-05'],
        sunrise: ['2025-07-04T04:50', '2025-07-05T04:51'],
        sunset: ['2025-07-04T21:31', '2025-07-05T21:30'],
        temperature_2m_max: [23.7, 27.3],
        precipitation_probability_max: [0, 3],
        precipitation_sum: [0.0, 0.0],
        sunshine_duration: [47835.34, 36199.98],
        temperature_2m_min: [14.4, 16.2],
      },
    }

    it('should return weather data on success', async () => {
      // Arrange
      const latitude = 52.52
      const longitude = 13.41
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockWeatherResponse),
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Act
      const result = await fetchWeatherData(latitude, longitude)

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('https://api.open-meteo.com/v1/forecast'))
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`latitude=${latitude}`))
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`longitude=${longitude}`))
      expect(mockResponse.json).toHaveBeenCalledOnce()
      expect(result).toEqual(mockWeatherResponse)
    })

    it('should include all required query parameters with updated values', async () => {
      // Arrange
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockWeatherResponse),
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Act
      await fetchWeatherData(52.52, 13.41)

      // Assert
      const callUrl = mockFetch.mock.calls?.[0]?.[0] as string
      expect(callUrl).toContain(
        'daily=sunrise%2Csunset%2Ctemperature_2m_max%2Cprecipitation_probability_max%2Cprecipitation_sum%2Csunshine_duration%2Ctemperature_2m_min',
      )
      expect(callUrl).toContain(
        'hourly=temperature_2m%2Cwind_speed_10m%2Cprecipitation_probability%2Cprecipitation%2Capparent_temperature%2Cdew_point_2m',
      )
      expect(callUrl).toContain('timezone=auto')
      expect(callUrl).toContain('forecast_hours=19') // Updated to 19 hours
      expect(callUrl).toContain('forecast_days=10') // Added 10 days
    })

    it('should throw error when HTTP response is not ok', async () => {
      // Arrange
      const mockResponse = {
        ok: false,
        status: 500,
      }
      mockFetch.mockResolvedValue(mockResponse)

      // Act & Assert
      await expect(fetchWeatherData(52.52, 13.41)).rejects.toThrow(
        'Failed to fetch weather data: HTTP error! status: 500',
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
      await expect(fetchWeatherData(52.52, 13.41)).rejects.toThrow('Failed to fetch weather data: Invalid JSON')
    })

    it('should throw error when fetch fails', async () => {
      // Arrange
      const networkError = new Error('Network error')
      mockFetch.mockRejectedValue(networkError)

      // Act & Assert
      await expect(fetchWeatherData(52.52, 13.41)).rejects.toThrow('Failed to fetch weather data: Network error')
    })

    it('should handle non-Error exceptions', async () => {
      // Arrange
      mockFetch.mockRejectedValue('String error')

      // Act & Assert
      await expect(fetchWeatherData(52.52, 13.41)).rejects.toThrow('Failed to fetch weather data: Unknown error')
    })
  })

  describe('processWeatherData', () => {
    const mockApiResponse: WeatherApiResponse = {
      latitude: 52.52,
      longitude: 13.419998,
      generationtime_ms: 63.33315372467041,
      utc_offset_seconds: 7200,
      timezone: 'Europe/Berlin',
      timezone_abbreviation: 'GMT+2',
      elevation: 38.0,
      hourly_units: {
        time: 'iso8601',
        temperature_2m: '°C',
        wind_speed_10m: 'km/h',
        precipitation_probability: '%',
        precipitation: 'mm',
        apparent_temperature: '°C',
        dew_point_2m: '°C',
      },
      hourly: {
        time: ['2025-07-04T16:00', '2025-07-04T19:00'],
        temperature_2m: [23.1, 23.4],
        wind_speed_10m: [6.4, 7.2],
        precipitation_probability: [0, 5],
        precipitation: [0.0, 0.1],
        apparent_temperature: [21.9, 21.0],
        dew_point_2m: [3.6, 3.9],
      },
      daily_units: {
        time: 'iso8601',
        sunrise: 'iso8601',
        sunset: 'iso8601',
        temperature_2m_max: '°C',
        precipitation_probability_max: '%',
        precipitation_sum: 'mm',
        sunshine_duration: 's',
        temperature_2m_min: '°C',
      },
      daily: {
        time: ['2025-07-04', '2025-07-05'],
        sunrise: ['2025-07-04T04:50', '2025-07-05T04:51'],
        sunset: ['2025-07-04T21:31', '2025-07-05T21:30'],
        temperature_2m_max: [23.7, 27.3],
        precipitation_probability_max: [0, 3],
        precipitation_sum: [0.0, 0.5],
        sunshine_duration: [47835.34, 36199.98],
        temperature_2m_min: [14.4, 16.2],
      },
    }

    it('should process weather data correctly with combined precipitation and formatted sunshine', () => {
      // Act
      const result = processWeatherData(mockApiResponse)

      // Assert
      expect(result.location).toEqual({
        latitude: 52.52,
        longitude: 13.419998,
        timezone: 'Europe/Berlin',
        timezone_abbreviation: 'GMT+2',
        elevation: 38.0,
      })

      expect(result.hourly).toEqual({
        '2025-07-04T16:00': {
          temperature_2m: '23.1°C',
          wind_speed_10m: '6.4km/h',
          precipitation_combined: '0mm (0%)', // Combined format
          apparent_temperature: '21.9°C',
          dew_point_2m: '3.6°C',
        },
        '2025-07-04T19:00': {
          temperature_2m: '23.4°C',
          wind_speed_10m: '7.2km/h',
          precipitation_combined: '0.1mm (5%)', // Combined format
          apparent_temperature: '21°C',
          dew_point_2m: '3.9°C',
        },
      })

      expect(result.daily).toEqual({
        '2025-07-04': {
          sunrise: '2025-07-04T04:50',
          sunset: '2025-07-04T21:31',
          temperature_2m_max: '23.7°C',
          precipitation_combined: '0mm (0%)', // Combined format
          sunshine_duration: '13h 17m', // Formatted from seconds
          temperature_2m_min: '14.4°C',
        },
        '2025-07-05': {
          sunrise: '2025-07-05T04:51',
          sunset: '2025-07-05T21:30',
          temperature_2m_max: '27.3°C',
          precipitation_combined: '0.5mm (3%)', // Combined format
          sunshine_duration: '10h 3m', // Formatted from seconds
          temperature_2m_min: '16.2°C',
        },
      })
    })

    it('should handle empty arrays', () => {
      // Arrange
      const emptyResponse: WeatherApiResponse = {
        ...mockApiResponse,
        hourly: {
          time: [],
          temperature_2m: [],
          wind_speed_10m: [],
          precipitation_probability: [],
          precipitation: [],
          apparent_temperature: [],
          dew_point_2m: [],
        },
        daily: {
          time: [],
          sunrise: [],
          sunset: [],
          temperature_2m_max: [],
          precipitation_probability_max: [],
          precipitation_sum: [],
          sunshine_duration: [],
          temperature_2m_min: [],
        },
      }

      // Act
      const result = processWeatherData(emptyResponse)

      // Assert
      expect(result.hourly).toEqual({})
      expect(result.daily).toEqual({})
      expect(result.location).toEqual({
        latitude: 52.52,
        longitude: 13.419998,
        timezone: 'Europe/Berlin',
        timezone_abbreviation: 'GMT+2',
        elevation: 38.0,
      })
    })
  })

  describe('formatWeatherData', () => {
    const mockProcessedData: ProcessedWeatherData = {
      location: {
        latitude: 52.52,
        longitude: 13.419998,
        timezone: 'Europe/Berlin',
        timezone_abbreviation: 'GMT+2',
        elevation: 38.0,
      },
      hourly: {
        '2025-07-04T16:00': {
          temperature_2m: '23.1°C',
          wind_speed_10m: '6.4km/h',
          precipitation_combined: '0mm (0%)',
          apparent_temperature: '21.9°C',
          dew_point_2m: '3.6°C',
        },
      },
      daily: {
        '2025-07-04': {
          sunrise: '2025-07-04T04:50',
          sunset: '2025-07-04T21:31',
          temperature_2m_max: '23.7°C',
          precipitation_combined: '0mm (0%)',
          sunshine_duration: '13h 17m',
          temperature_2m_min: '14.4°C',
        },
      },
    }

    it('should format weather data correctly with new format', () => {
      // Act
      const result = formatWeatherData(mockProcessedData)

      // Assert
      expect(result).toContain('Weather Forecast for Location')
      expect(result).toContain('Coordinates: 52.52, 13.419998')
      expect(result).toContain('Timezone: Europe/Berlin (GMT+2)')
      expect(result).toContain('Elevation: 38m')
      expect(result).toContain('Hourly Forecast (Next 19 hours):')
      expect(result).toContain('Time: 2025-07-04T16:00')
      expect(result).toContain('Temperature: 23.1°C')
      expect(result).toContain('Wind Speed: 6.4km/h')
      expect(result).toContain('Precipitation: 0mm (0%)') // Combined format
      expect(result).toContain('Daily Forecast (Next 10 days):')
      expect(result).toContain('Date: 2025-07-04')
      expect(result).toContain('Sunrise: 2025-07-04T04:50')
      expect(result).toContain('Max Temperature: 23.7°C')
      expect(result).toContain('Sunshine Duration: 13h 17m') // Formatted duration
      expect(result).not.toContain('Max Precipitation Probability:') // Should be removed
      expect(result).not.toContain('Precipitation Sum:') // Should be removed
    })

    it('should handle empty hourly and daily data', () => {
      // Arrange
      const emptyData: ProcessedWeatherData = {
        location: mockProcessedData.location,
        hourly: {},
        daily: {},
      }

      // Act
      const result = formatWeatherData(emptyData)

      // Assert
      expect(result).toContain('Weather Forecast for Location')
      expect(result).toContain('Hourly Forecast (Next 19 hours):')
      expect(result).toContain('Daily Forecast (Next 10 days):')
      // Should not contain any specific time entries
      expect(result).not.toContain('Time: ')
      expect(result).not.toContain('Date: ')
    })
  })
})
