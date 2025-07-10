// Formatting for weather-by-coords tool
import type { ProcessedWeatherData } from './types.js'

export const formatWeatherData = (data: ProcessedWeatherData): string => {
  let result = `Weather Forecast for Location\n`
  result += `Coordinates: ${data.location.latitude}, ${data.location.longitude}\n`
  result += `Timezone: ${data.location.timezone} (${data.location.timezone_abbreviation})\n`
  result += `Elevation: ${data.location.elevation}m\n\n`
  result += `Hourly Forecast (Next 19 hours):\n`
  result += `=====================================\n`
  Object.entries(data.hourly).forEach(([time, hourlyData]) => {
    result += `Time: ${time}\n`
    result += ` Temperature: ${hourlyData.temperature_2m}\n`
    result += ` Apparent Temperature: ${hourlyData.apparent_temperature}\n`
    result += ` Wind Speed: ${hourlyData.wind_speed_10m}\n`
    result += ` Precipitation: ${hourlyData.precipitation_combined}\n`
    result += ` Dew Point: ${hourlyData.dew_point_2m}\n\n`
  })
  result += `Daily Forecast (Next 10 days):\n`
  result += `===============================\n`
  Object.entries(data.daily).forEach(([date, dailyData]) => {
    result += `Date: ${date}\n`
    result += ` Sunrise: ${dailyData.sunrise}\n`
    result += ` Sunset: ${dailyData.sunset}\n`
    result += ` Max Temperature: ${dailyData.temperature_2m_max}\n`
    result += ` Min Temperature: ${dailyData.temperature_2m_min}\n`
    result += ` Precipitation: ${dailyData.precipitation_combined}\n`
    result += ` Sunshine Duration: ${dailyData.sunshine_duration}\n\n`
  })
  return result.trim()
}

export const formatWeatherError = (error: unknown, latitude?: number, longitude?: number): string => {
  const base =
    latitude !== undefined && longitude !== undefined
      ? `Error getting weather data for coordinates ${latitude}, ${longitude}: `
      : 'Error: '
  if (error instanceof Error) return base + error.message
  if (typeof error === 'string') return base + error
  return base + 'Unknown error.'
}
