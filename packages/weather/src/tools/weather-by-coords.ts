// MCP tool registration for weather-by-coords
import { registerTool, type SchemaTypeOf } from '@mcp-monorepo/shared'
import { z } from 'zod'

import type { WeatherApiResponse } from './weather-by-coords.types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const OutputSchemaDef = {
  location: z.object({
    timezone: z.string(),
    timezone_abbreviation: z.string(),
    elevation: z.string(),
  }),
  hourly: z.record(
    z.string(),
    z.object({
      temp: z.string(),
      wind: z.string(),
      precip: z.string(),
      precip_prop: z.string(),
      temp_apparent: z.string(),
      dew_point: z.string(),
    }),
  ),
  daily: z.record(
    z.string(),
    z.object({
      sunrise: z.string(),
      sunset: z.string(),
      temp_max: z.string(),
      temp_min: z.string(),
      precip_sum: z.string(),
      precip_prop: z.string(),
      sunshine: z.string(),
    }),
  ),
}

export type ProcessedWeatherData = SchemaTypeOf<typeof OutputSchemaDef>

export const registerWeatherByCoordsTool = (server: McpServer) =>
  registerTool(server, {
    name: 'weather-by-coords',
    title: 'Get Weather by Coordinates',
    description: 'Fetches multi-day and multi-hour weather forecast for a location (lat/lon) using Open-Meteo.',
    inputSchema: {
      latitude: z.number().min(-90).max(90).describe('Latitude, -90 to 90'),
      longitude: z.number().min(-180).max(180).describe('Longitude, -180 to 180'),
    },
    outputSchema: OutputSchemaDef,
    isReadOnly: true,
    async fetcher({ latitude, longitude }) {
      const params = {
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        daily:
          'sunrise,sunset,temperature_2m_max,precipitation_probability_max,precipitation_sum,sunshine_duration,temperature_2m_min',
        hourly:
          'temperature_2m,wind_speed_10m,precipitation_probability,precipitation,apparent_temperature,dew_point_2m',
        timezone: 'auto',
        forecast_hours: '24',
        forecast_days: '10',
      }
      const url = new URL('https://api.open-meteo.com/v1/forecast')
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return (await response.json()) as WeatherApiResponse
    },
    formatter(data) {
      const hourly: ProcessedWeatherData['hourly'] = {}
      data.hourly.time.forEach((time, i) => {
        hourly[time] = {
          temp: `${data.hourly.temperature_2m[i]}${data.hourly_units.temperature_2m}`,
          wind: `${data.hourly.wind_speed_10m[i]}${data.hourly_units.wind_speed_10m}`,
          precip: `${data.hourly.precipitation?.[i] ?? 0}${data.hourly_units.precipitation}`,
          precip_prop: `${data.hourly.precipitation_probability?.[i] ?? 0}${data.hourly_units.precipitation_probability}`,
          temp_apparent: `${data.hourly.apparent_temperature[i]}${data.hourly_units.apparent_temperature}`,
          dew_point: `${data.hourly.dew_point_2m[i]}${data.hourly_units.dew_point_2m}`,
        }
      })

      const daily: ProcessedWeatherData['daily'] = {}
      data.daily.time.forEach((date, i) => {
        const sunriseTime = data.daily.sunrise[i]?.split('T')[1] || data.daily.sunrise[i] || ''
        const sunsetTime = data.daily.sunset[i]?.split('T')[1] || data.daily.sunset[i] || ''
        const sunshineDuration = formatSunshineDuration(data.daily.sunshine_duration?.[i] ?? 0)

        daily[date] = {
          sunrise: sunriseTime,
          sunset: sunsetTime,
          temp_max: `${data.daily.temperature_2m_max[i]}${data.daily_units.temperature_2m_max}`,
          temp_min: `${data.daily.temperature_2m_min[i]}${data.daily_units.temperature_2m_min}`,
          precip_sum: `${data.daily.precipitation_sum?.[i] ?? 0}${data.daily_units.precipitation_sum}`,
          precip_prop: `${data.daily.precipitation_probability_max?.[i] ?? 0}${data.daily_units.precipitation_probability_max}`,
          sunshine: sunshineDuration,
        }
      })

      return {
        location: {
          timezone: data.timezone,
          timezone_abbreviation: data.timezone_abbreviation,
          elevation: `${data.elevation}m`,
        },
        hourly,
        daily,
      }
    },
  })

const formatSunshineDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}
