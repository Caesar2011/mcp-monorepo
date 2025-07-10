// Helper and formatter tests for weather-by-coords tool
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  fetchWeatherData,
  processWeatherData,
  isValidCoordinates,
  formatSunshineDuration,
  formatPrecipitationCombined,
} from './helper.js'

import type { WeatherApiResponse } from './types.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('Weather-By-Coords Helper & Formatter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Sunshine duration
  it('formats sunshine duration', () => {
    expect(formatSunshineDuration(0)).toBe('0m')
    expect(formatSunshineDuration(3660)).toBe('1h 1m')
    expect(formatSunshineDuration(7320)).toBe('2h 2m')
    expect(formatSunshineDuration(47349.81)).toBe('13h 9m')
  })

  // Precipitation combined
  it('formats precipitation combined', () => {
    expect(formatPrecipitationCombined(0, 0, 'mm', '%')).toBe('0mm (0%)')
    expect(formatPrecipitationCombined(0.5, 30, 'mm', '%')).toBe('0.5mm (30%)')
  })

  // Coordinate validation
  it('validates coordinates', () => {
    expect(isValidCoordinates(0, 0)).toBe(true)
    expect(isValidCoordinates(90, 180)).toBe(true)
    expect(isValidCoordinates(-91, 0)).toBe(false)
    expect(isValidCoordinates(0, 181)).toBe(false)
  })

  // fetchWeatherData
  it('fetches weather', async () => {
    const apiRes: WeatherApiResponse = {
      latitude: 1,
      longitude: 2,
      generationtime_ms: 1,
      utc_offset_seconds: 0,
      timezone: 'T',
      timezone_abbreviation: 'TZ',
      elevation: 10,
      hourly_units: {
        time: '',
        temperature_2m: 'C',
        wind_speed_10m: 'k',
        precipitation_probability: '%',
        precipitation: 'mm',
        apparent_temperature: 'C',
        dew_point_2m: 'C',
      },
      hourly: {
        time: ['t'],
        temperature_2m: [1],
        wind_speed_10m: [2],
        precipitation_probability: [3],
        precipitation: [4],
        apparent_temperature: [5],
        dew_point_2m: [6],
      },
      daily_units: {
        time: '',
        sunrise: '',
        sunset: '',
        temperature_2m_max: 'C',
        precipitation_probability_max: '%',
        precipitation_sum: 'mm',
        sunshine_duration: 's',
        temperature_2m_min: 'C',
      },
      daily: {
        time: ['t'],
        sunrise: ['s'],
        sunset: ['e'],
        temperature_2m_max: [7],
        precipitation_probability_max: [8],
        precipitation_sum: [9],
        sunshine_duration: [600],
        temperature_2m_min: [10],
      },
    }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => apiRes })
    const out = await fetchWeatherData(1, 2)
    expect(out).toEqual(apiRes)
  })

  // processWeatherData
  it('processes weather', () => {
    const api: WeatherApiResponse = {
      latitude: 1,
      longitude: 1,
      generationtime_ms: 1,
      utc_offset_seconds: 0,
      timezone: 'TZ',
      timezone_abbreviation: 'T',
      elevation: 0,
      hourly_units: {
        time: '',
        temperature_2m: 'C',
        wind_speed_10m: 'k',
        precipitation_probability: '%',
        precipitation: 'mm',
        apparent_temperature: 'C',
        dew_point_2m: 'C',
      },
      hourly: {
        time: ['t'],
        temperature_2m: [1],
        wind_speed_10m: [2],
        precipitation_probability: [3],
        precipitation: [4],
        apparent_temperature: [5],
        dew_point_2m: [6],
      },
      daily_units: {
        time: '',
        sunrise: '',
        sunset: '',
        temperature_2m_max: 'C',
        precipitation_probability_max: '%',
        precipitation_sum: 'mm',
        sunshine_duration: 's',
        temperature_2m_min: 'C',
      },
      daily: {
        time: ['d'],
        sunrise: ['a'],
        sunset: ['z'],
        temperature_2m_max: [7],
        precipitation_probability_max: [8],
        precipitation_sum: [9],
        sunshine_duration: [120],
        temperature_2m_min: [10],
      },
    }
    const out = processWeatherData(api)
    expect(out.location.latitude).toBe(1)
    expect(out.hourly.t).toBeTruthy()
    expect(out.daily.d).toBeTruthy()
  })
})
