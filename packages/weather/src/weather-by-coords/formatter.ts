// Formatting for weather-by-coords tool
import type { ProcessedWeatherData } from './types.js'

export const formatWeatherData = (data: ProcessedWeatherData): string => {
  let result = `Weather Forecast for Location\n`
  result += `Coordinates: ${data.location.latitude}, ${data.location.longitude}\n`
  result += `Timezone: ${data.location.timezone} (${data.location.timezone_abbreviation})\n`
  result += `Elevation: ${data.location.elevation}m\n\n`
  result += `Hourly Forecast (Next 24 hours):\n`
  result += `=====================================\n`
  Object.entries(data.hourly).forEach(([time, h]) => {
    result += `${time} | temp:${h.temperature_2m}°C, feels:${h.apparent_temperature}°C, wind:${h.wind_speed_10m}km/h, precip:${h.precipitation_combined}mm, dew:${h.dew_point_2m}°C\n`
  })
  result += `\nDaily Forecast (Next 10 days):\n`
  result += `===============================\n`
  Object.entries(data.daily).forEach(([date, d]) => {
    const sunriseTime = d.sunrise.split('T')[1] || d.sunrise
    const sunsetTime = d.sunset.split('T')[1] || d.sunset
    result += `${date} | sunrise:${sunriseTime} sunset:${sunsetTime}, max:${d.temperature_2m_max}°C, min:${d.temperature_2m_min}°C, precip:${d.precipitation_combined}mm, sun:${d.sunshine_duration}\n`
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
