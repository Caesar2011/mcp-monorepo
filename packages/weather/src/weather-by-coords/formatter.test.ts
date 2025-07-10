import { describe, it, expect } from 'vitest'

import { formatWeatherData } from './formatter.js'
import { type ProcessedWeatherData } from './types'

describe('formatWeatherData', () => {
  it('formats hourly and daily data compactly with section headers and trimmed sunrise/sunset', () => {
    const input: ProcessedWeatherData = {
      location: {
        latitude: 52.5,
        longitude: 13.4,
        timezone: 'Europe/Berlin',
        timezone_abbreviation: 'CEST',
        elevation: 34,
      },
      hourly: {
        '2025-07-10T08:00': {
          temperature_2m: '20.5',
          apparent_temperature: '20.1',
          wind_speed_10m: '8.2',
          precipitation_combined: '0.0',
          dew_point_2m: '13.4',
        },
      },
      daily: {
        '2025-07-10': {
          sunrise: '2025-07-10T04:56',
          sunset: '2025-07-10T21:27',
          temperature_2m_max: '22.3',
          temperature_2m_min: '15.3',
          precipitation_combined: '2',
          sunshine_duration: '8h 12m',
        },
      },
    }
    const out = formatWeatherData(input)
    expect(out).toContain('Hourly Forecast')
    expect(out).toContain('Daily Forecast')
    expect(out).toContain('2025-07-10T08:00 | temp:20.5°C, feels:20.1°C, wind:8.2km/h, precip:0.0mm, dew:13.4°C')
    expect(out).toContain('2025-07-10 | sunrise:04:56 sunset:21:27, max:22.3°C, min:15.3°C, precip:2mm, sun:8h 12m')
    // No date in the sunrise/sunset part
    expect(out).not.toContain('2025-07-10T04:56T')
    expect(out).not.toContain('🌅')
    expect(out).not.toContain('🌇')
  })
})
