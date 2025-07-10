// Business logic for weather-by-coords tool
import type { WeatherApiResponse, ProcessedWeatherData, HourlyWeatherData, DailyWeatherData } from './types.js'

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
    url.searchParams.set('forecast_hours', '24')
    url.searchParams.set('forecast_days', '10')
    const response = await fetch(url.toString())
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return (await response.json()) as WeatherApiResponse
  } catch (error) {
    throw new Error(`Failed to fetch weather data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const processWeatherData = (data: WeatherApiResponse): ProcessedWeatherData => {
  const hourlyData: Record<string, HourlyWeatherData> = {}
  data.hourly.time.forEach((time, i) => {
    hourlyData[time] = {
      temperature_2m: data.hourly.temperature_2m[i],
      wind_speed_10m: data.hourly.wind_speed_10m[i],
      precipitation: data.hourly.precipitation?.[i] ?? 0,
      precipitation_probability: data.hourly.precipitation_probability?.[i] ?? 0,
      apparent_temperature: data.hourly.apparent_temperature[i],
      dew_point_2m: data.hourly.dew_point_2m[i],
    }
  })
  const dailyData: Record<string, DailyWeatherData> = {}
  data.daily.time.forEach((date, i) => {
    dailyData[date] = {
      sunrise: data.daily.sunrise[i] ?? '',
      sunset: data.daily.sunset[i] ?? '',
      temperature_2m_max: data.daily.temperature_2m_max[i],
      precipitation_sum: data.daily.precipitation_sum?.[i] ?? 0,
      precipitation_probability_max: data.daily.precipitation_probability_max?.[i] ?? 0,
      sunshine_duration: formatSunshineDuration(data.daily.sunshine_duration?.[i] ?? 0),
      temperature_2m_min: data.daily.temperature_2m_min[i],
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
    units: {
      hourly: data.hourly_units,
      daily: data.daily_units,
    },
  }
}
