// Handler test for weather-by-coords MCP tool
import { describe, it, expect, vi, beforeEach } from 'vitest'

import * as formatter from './formatter.js'
import { weatherByCoordsHandler } from './handler.js'
import * as helper from './helper.js'

import type { ProcessedWeatherData, WeatherApiResponse } from './types.js'

describe('weatherByCoordsHandler', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  it('returns error on invalid coordinates', async () => {
    const out = await weatherByCoordsHandler({ latitude: 100, longitude: 200 })
    expect(out.content[0]?.text).toMatch(/Invalid coordinates/)
    expect(out.content[0]?._meta?.stderr).toBe('Invalid coordinates')
  })
  it('returns formatted result on valid data', async () => {
    vi.spyOn(helper, 'fetchWeatherData').mockResolvedValue({
      latitude: 52,
      longitude: 13,
      generationtime_ms: 0,
      utc_offset_seconds: 0,
      timezone: 'UTC',
      timezone_abbreviation: 'UTC',
      elevation: 32,
      hourly_units: {
        time: '',
        temperature_2m: '',
        wind_speed_10m: '',
        precipitation_probability: '',
        precipitation: '',
        apparent_temperature: '',
        dew_point_2m: '',
      },
      hourly: {
        time: [],
        temperature_2m: [],
        wind_speed_10m: [],
        precipitation_probability: [],
        precipitation: [],
        apparent_temperature: [],
        dew_point_2m: [],
      },
      daily_units: {
        time: '',
        sunrise: '',
        sunset: '',
        temperature_2m_max: '',
        precipitation_probability_max: '',
        precipitation_sum: '',
        sunshine_duration: '',
        temperature_2m_min: '',
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
    } as WeatherApiResponse)
    vi.spyOn(helper, 'processWeatherData').mockReturnValue({
      location: {},
      hourly: {},
      daily: {},
      units: { hourly: {}, daily: {} },
    } as unknown as ProcessedWeatherData)
    vi.spyOn(formatter, 'formatWeatherData').mockReturnValue('formattedWeather!')
    const out = await weatherByCoordsHandler({ latitude: 52, longitude: 13 })
    expect(out.content[0]?.text).toBe('formattedWeather!')
  })
  it('handles helper errors with error formatter', async () => {
    vi.spyOn(helper, 'fetchWeatherData').mockRejectedValue(new Error('fail-net'))
    vi.spyOn(formatter, 'formatWeatherError').mockReturnValue('err-weather!')
    const out = await weatherByCoordsHandler({ latitude: 51, longitude: 10 })
    expect(out.content[0]?.text).toBe('err-weather!')
    expect(out.content[0]?._meta?.stderr).toBe('fail-net')
  })
})
