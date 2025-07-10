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
    const u = data.units.hourly
    const precipStr =
      h.precipitation !== undefined
        ? `precip:${h.precipitation}${u.precipitation}${h.precipitation_probability !== undefined ? ` (${h.precipitation_probability}${u.precipitation_probability})` : ''}`
        : ''
    result += `${time} | temp:${h.temperature_2m}${u.temperature_2m}, feels:${h.apparent_temperature}${u.apparent_temperature}, wind:${h.wind_speed_10m}${u.wind_speed_10m}, ${precipStr}, dew:${h.dew_point_2m}${u.dew_point_2m}\n`
  })
  result += `\nDaily Forecast (Next 10 days):\n`
  result += `===============================\n`
  Object.entries(data.daily).forEach(([date, d]) => {
    const u = data.units.daily
    const sunriseTime = d.sunrise.split('T')[1] || d.sunrise
    const sunsetTime = d.sunset.split('T')[1] || d.sunset
    const precipStr =
      d.precipitation_sum !== undefined
        ? `precip:${d.precipitation_sum}${u.precipitation_sum}${d.precipitation_probability_max !== undefined ? ` (${d.precipitation_probability_max}${u.precipitation_probability_max})` : ''}`
        : ''
    result += `${date} | sunrise:${sunriseTime} sunset:${sunsetTime}, max:${d.temperature_2m_max}${u.temperature_2m_max}, min:${d.temperature_2m_min}${u.temperature_2m_min}, ${precipStr}, sun:${d.sunshine_duration}\n`
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
