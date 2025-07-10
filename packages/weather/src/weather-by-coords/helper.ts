// Business logic for weather-by-coords tool
import type { WeatherApiResponse, ProcessedWeatherData } from './types.js'

export const formatSunshineDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export const formatPrecipitationCombined = (
  amount: number,
  probability: number,
  amountUnit: string,
  probabilityUnit: string,
): string => `${amount}${amountUnit} (${probability}${probabilityUnit})`

export const isValidCoordinates = (latitude: number, longitude: number): boolean =>
  typeof latitude === 'number' &&
  typeof longitude === 'number' &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180 &&
  !isNaN(latitude) &&
  !isNaN(longitude)

type HourlyDatum = {
  temperature_2m: string
  wind_speed_10m: string
  precipitation_combined: string
  apparent_temperature: string
  dew_point_2m: string
}
type DailyDatum = {
  sunrise: string
  sunset: string
  temperature_2m_max: string
  precipitation_combined: string
  sunshine_duration: string
  temperature_2m_min: string
}

export const fetchWeatherData = async (latitude: number, longitude: number): Promise<WeatherApiResponse> => {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', latitude.toString())
    url.searchParams.set('longitude', longitude.toString())
    url.searchParams.set(
      'daily',
      'sunrise,sunset,temperature_2m_max,precipitation_probability_max,precipitation_sum,sunshine_duration,temperature_2m_min',
    )
    url.searchParams.set(
      'hourly',
      'temperature_2m,wind_speed_10m,precipitation_probability,precipitation,apparent_temperature,dew_point_2m',
    )
    url.searchParams.set('timezone', 'auto')
    url.searchParams.set('forecast_hours', '19')
    url.searchParams.set('forecast_days', '10')
    const response = await fetch(url.toString())
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return (await response.json()) as WeatherApiResponse
  } catch (error) {
    throw new Error(`Failed to fetch weather data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const processWeatherData = (data: WeatherApiResponse): ProcessedWeatherData => {
  const hourlyData: Record<string, HourlyDatum> = {}
  data.hourly.time.forEach((time, i) => {
    hourlyData[time] = {
      temperature_2m: `${data.hourly.temperature_2m[i]}${data.hourly_units.temperature_2m}`,
      wind_speed_10m: `${data.hourly.wind_speed_10m[i]}${data.hourly_units.wind_speed_10m}`,
      precipitation_combined: formatPrecipitationCombined(
        data.hourly.precipitation?.[i] ?? 0,
        data.hourly.precipitation_probability?.[i] ?? 0,
        data.hourly_units.precipitation,
        data.hourly_units.precipitation_probability,
      ),
      apparent_temperature: `${data.hourly.apparent_temperature[i]}${data.hourly_units.apparent_temperature}`,
      dew_point_2m: `${data.hourly.dew_point_2m[i]}${data.hourly_units.dew_point_2m}`,
    }
  })
  const dailyData: Record<string, DailyDatum> = {}
  data.daily.time.forEach((date, i) => {
    dailyData[date] = {
      sunrise: data.daily.sunrise[i] ?? '',
      sunset: data.daily.sunset[i] ?? '',
      temperature_2m_max: `${data.daily.temperature_2m_max[i]}${data.daily_units.temperature_2m_max}`,
      precipitation_combined: formatPrecipitationCombined(
        data.daily.precipitation_sum?.[i] ?? 0,
        data.daily.precipitation_probability_max[i] ?? 0,
        data.daily_units.precipitation_sum,
        data.daily_units.precipitation_probability_max,
      ),
      sunshine_duration: formatSunshineDuration(data.daily.sunshine_duration?.[i] ?? 0),
      temperature_2m_min: `${data.daily.temperature_2m_min[i]}${data.daily_units.temperature_2m_min}`,
    }
  })
  return {
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      timezone_abbreviation: data.timezone_abbreviation,
      elevation: data.elevation,
    },
    hourly: hourlyData,
    daily: dailyData,
  }
}
