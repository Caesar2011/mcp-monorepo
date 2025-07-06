import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getWeatherHandler } from './handler.js'

// Mock all helper functions
vi.mock('./helpers.js', () => ({
  fetchWeatherData: vi.fn(),
  processWeatherData: vi.fn(),
  formatWeatherData: vi.fn(),
  isValidCoordinates: vi.fn(),
}))

import {
  fetchWeatherData,
  processWeatherData,
  formatWeatherData,
  isValidCoordinates,
  type WeatherApiResponse,
  type ProcessedWeatherData,
  HourlyWeatherData,
  DailyWeatherData,
} from './helpers.js'

describe('Weather Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getWeatherHandler', () => {
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
        time: ['2025-07-04T16:00'],
        temperature_2m: [23.1],
        wind_speed_10m: [6.4],
        precipitation_probability: [0],
        precipitation: [0.0],
        apparent_temperature: [21.9],
        dew_point_2m: [3.6],
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
        time: ['2025-07-04'],
        sunrise: ['2025-07-04T04:50'],
        sunset: ['2025-07-04T21:31'],
        temperature_2m_max: [23.7],
        precipitation_probability_max: [0],
        precipitation_sum: [0.0],
        sunshine_duration: [47835.34],
        temperature_2m_min: [14.4],
      },
    }

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

    it('should return formatted weather data on success', async () => {
      // Arrange
      const latitude = 52.52
      const longitude = 13.41
      const mockFormattedData = 'Weather Forecast for Berlin, Germany\nTemperature: 23.1°C'

      vi.mocked(isValidCoordinates).mockReturnValue(true)
      vi.mocked(fetchWeatherData).mockResolvedValue(mockApiResponse)
      vi.mocked(processWeatherData).mockReturnValue(mockProcessedData)
      vi.mocked(formatWeatherData).mockReturnValue(mockFormattedData)

      // Act
      const result = await getWeatherHandler({ latitude, longitude })

      // Assert
      expect(isValidCoordinates).toHaveBeenCalledWith(latitude, longitude)
      expect(fetchWeatherData).toHaveBeenCalledWith(latitude, longitude)
      expect(processWeatherData).toHaveBeenCalledWith(mockApiResponse)
      expect(formatWeatherData).toHaveBeenCalledWith(mockProcessedData)
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: mockFormattedData,
          },
        ],
      })
    })

    it('should return error for invalid coordinates', async () => {
      // Arrange
      const invalidLatitude = 100
      const validLongitude = 13.41
      vi.mocked(isValidCoordinates).mockReturnValue(false)

      // Act
      const result = await getWeatherHandler({ latitude: invalidLatitude, longitude: validLongitude })

      // Assert
      expect(isValidCoordinates).toHaveBeenCalledWith(invalidLatitude, validLongitude)
      expect(fetchWeatherData).not.toHaveBeenCalled()
      expect(processWeatherData).not.toHaveBeenCalled()
      expect(formatWeatherData).not.toHaveBeenCalled()
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Error: Invalid coordinates. Latitude must be between -90 and 90, longitude must be between -180 and 180. Received: lat=${invalidLatitude}, lon=${validLongitude}`,
            _meta: { stderr: 'Invalid coordinates' },
          },
        ],
      })
    })

    it('should handle error when fetchWeatherData fails', async () => {
      // Arrange
      const latitude = 52.52
      const longitude = 13.41
      const errorMessage = 'Weather service unavailable'

      vi.mocked(isValidCoordinates).mockReturnValue(true)
      vi.mocked(fetchWeatherData).mockRejectedValue(new Error(errorMessage))

      // Act
      const result = await getWeatherHandler({ latitude, longitude })

      // Assert
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Error getting weather data for coordinates ${latitude}, ${longitude}: ${errorMessage}`,
            _meta: { stderr: errorMessage },
          },
        ],
      })
      expect(processWeatherData).not.toHaveBeenCalled()
      expect(formatWeatherData).not.toHaveBeenCalled()
    })

    it('should handle error when processWeatherData fails', async () => {
      // Arrange
      const latitude = 52.52
      const longitude = 13.41
      const errorMessage = 'Data processing failed'

      vi.mocked(isValidCoordinates).mockReturnValue(true)
      vi.mocked(fetchWeatherData).mockResolvedValue(mockApiResponse)
      vi.mocked(processWeatherData).mockImplementation(() => {
        throw new Error(errorMessage)
      })

      // Act
      const result = await getWeatherHandler({ latitude, longitude })

      // Assert
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Error getting weather data for coordinates ${latitude}, ${longitude}: ${errorMessage}`,
            _meta: { stderr: errorMessage },
          },
        ],
      })
      expect(formatWeatherData).not.toHaveBeenCalled()
    })

    it('should handle error when formatWeatherData fails', async () => {
      // Arrange
      const latitude = 52.52
      const longitude = 13.41
      const errorMessage = 'Data formatting error'

      vi.mocked(isValidCoordinates).mockReturnValue(true)
      vi.mocked(fetchWeatherData).mockResolvedValue(mockApiResponse)
      vi.mocked(processWeatherData).mockReturnValue(mockProcessedData)
      vi.mocked(formatWeatherData).mockImplementation(() => {
        throw new Error(errorMessage)
      })

      // Act
      const result = await getWeatherHandler({ latitude, longitude })

      // Assert
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Error getting weather data for coordinates ${latitude}, ${longitude}: ${errorMessage}`,
            _meta: { stderr: errorMessage },
          },
        ],
      })
    })

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const latitude = 52.52
      const longitude = 13.41
      vi.mocked(isValidCoordinates).mockReturnValue(true)
      vi.mocked(fetchWeatherData).mockRejectedValue('String error')

      // Act
      const result = await getWeatherHandler({ latitude, longitude })

      // Assert
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Error getting weather data for coordinates ${latitude}, ${longitude}: Unknown error`,
            _meta: { stderr: 'Unknown error' },
          },
        ],
      })
    })

    it.each([
      { lat: -91, lon: 0, desc: 'latitude too low' },
      { lat: 91, lon: 0, desc: 'latitude too high' },
      { lat: 0, lon: -181, desc: 'longitude too low' },
      { lat: 0, lon: 181, desc: 'longitude too high' },
      { lat: NaN, lon: 0, desc: 'latitude is NaN' },
      { lat: 0, lon: NaN, desc: 'longitude is NaN' },
    ])('should handle invalid coordinates: $desc', async ({ lat, lon }) => {
      // Arrange
      vi.mocked(isValidCoordinates).mockReturnValue(false)

      // Act
      const result = await getWeatherHandler({ latitude: lat, longitude: lon })

      // Assert
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Error: Invalid coordinates. Latitude must be between -90 and 90, longitude must be between -180 and 180. Received: lat=${lat}, lon=${lon}`,
            _meta: { stderr: 'Invalid coordinates' },
          },
        ],
      })
    })

    it('should handle extreme valid coordinates', async () => {
      // Arrange
      const latitude = -90
      const longitude = 180
      const mockFormattedData = 'Weather data for extreme coordinates'

      vi.mocked(isValidCoordinates).mockReturnValue(true)
      vi.mocked(fetchWeatherData).mockResolvedValue(mockApiResponse)
      vi.mocked(processWeatherData).mockReturnValue(mockProcessedData)
      vi.mocked(formatWeatherData).mockReturnValue(mockFormattedData)

      // Act
      const result = await getWeatherHandler({ latitude, longitude })

      // Assert
      expect(isValidCoordinates).toHaveBeenCalledWith(latitude, longitude)
      expect(fetchWeatherData).toHaveBeenCalledWith(latitude, longitude)
      expect(result.content?.[0]?.text).toBe(mockFormattedData)
      expect(result.content?.[0]?._meta).toBe(undefined)
    })

    it('should handle decimal coordinates', async () => {
      // Arrange
      const latitude = 52.520008
      const longitude = 13.404954
      const mockFormattedData = 'Weather data for precise coordinates'

      vi.mocked(isValidCoordinates).mockReturnValue(true)
      vi.mocked(fetchWeatherData).mockResolvedValue(mockApiResponse)
      vi.mocked(processWeatherData).mockReturnValue(mockProcessedData)
      vi.mocked(formatWeatherData).mockReturnValue(mockFormattedData)

      // Act
      const result = await getWeatherHandler({ latitude, longitude })

      // Assert
      expect(isValidCoordinates).toHaveBeenCalledWith(latitude, longitude)
      expect(fetchWeatherData).toHaveBeenCalledWith(latitude, longitude)
      expect(result.content?.[0]?.text).toBe(mockFormattedData)
      expect(result.content?.[0]?._meta).toBe(undefined)
    })

    it('should process weather data with combined precipitation format', async () => {
      // Arrange
      const latitude = 52.52
      const longitude = 13.41
      const mockFormattedData = 'Weather data with precipitation: 20mm (70%)'

      const mockProcessedDataWithPrecip: ProcessedWeatherData = {
        ...mockProcessedData,
        hourly: {
          '2025-07-04T16:00': {
            ...(mockProcessedData.hourly['2025-07-04T16:00'] as HourlyWeatherData),
            precipitation_combined: '20mm (70%)',
          },
        },
        daily: {
          '2025-07-04': {
            ...(mockProcessedData.daily['2025-07-04'] as DailyWeatherData),
            precipitation_combined: '20mm (70%)',
            sunshine_duration: '13h 8m',
          },
        },
      }

      vi.mocked(isValidCoordinates).mockReturnValue(true)
      vi.mocked(fetchWeatherData).mockResolvedValue(mockApiResponse)
      vi.mocked(processWeatherData).mockReturnValue(mockProcessedDataWithPrecip)
      vi.mocked(formatWeatherData).mockReturnValue(mockFormattedData)

      // Act
      const result = await getWeatherHandler({ latitude, longitude })

      // Assert
      expect(processWeatherData).toHaveBeenCalledWith(mockApiResponse)
      expect(formatWeatherData).toHaveBeenCalledWith(mockProcessedDataWithPrecip)
      expect(result.content?.[0]?.text).toBe(mockFormattedData)
      expect(result.content?.[0]?._meta).toBe(undefined)
    })
  })
})
