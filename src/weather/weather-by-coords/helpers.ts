// Interface for Open-Meteo API response
export interface WeatherApiResponse {
  latitude: number
  longitude: number
  generationtime_ms: number
  utc_offset_seconds: number
  timezone: string
  timezone_abbreviation: string
  elevation: number
  hourly_units: {
    time: string
    temperature_2m: string
    wind_speed_10m: string
    precipitation_probability: string
    precipitation: string
    apparent_temperature: string
    dew_point_2m: string
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    wind_speed_10m: number[]
    precipitation_probability: number[]
    precipitation: number[]
    apparent_temperature: number[]
    dew_point_2m: number[]
  }
  daily_units: {
    time: string
    sunrise: string
    sunset: string
    temperature_2m_max: string
    precipitation_probability_max: string
    precipitation_sum: string
    sunshine_duration: string
    temperature_2m_min: string
  }
  daily: {
    time: string[]
    sunrise: string[]
    sunset: string[]
    temperature_2m_max: number[]
    precipitation_probability_max: number[]
    precipitation_sum: number[]
    sunshine_duration: number[]
    temperature_2m_min: number[]
  }
}

// Processed hourly data with units
export interface HourlyWeatherData {
  temperature_2m: string
  wind_speed_10m: string
  precipitation_combined: string // Combined probability and amount
  apparent_temperature: string
  dew_point_2m: string
}

// Processed daily data with units
export interface DailyWeatherData {
  sunrise: string
  sunset: string
  temperature_2m_max: string
  precipitation_combined: string // Combined probability and amount
  sunshine_duration: string // Formatted as hours and minutes
  temperature_2m_min: string
}

// Final processed weather data
export interface ProcessedWeatherData {
  location: {
    latitude: number
    longitude: number
    timezone: string
    timezone_abbreviation: string
    elevation: number
  }
  hourly: Record<string, HourlyWeatherData>
  daily: Record<string, DailyWeatherData>
}

// Helper function to format sunshine duration from seconds to hours and minutes
export const formatSunshineDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours === 0) {
    return `${minutes}m`
  } else if (minutes === 0) {
    return `${hours}h`
  } else {
    return `${hours}h ${minutes}m`
  }
}

// Helper function to combine precipitation probability and amount
export const formatPrecipitationCombined = (
  amount: number,
  probability: number,
  amountUnit: string,
  probabilityUnit: string,
): string => {
  return `${amount}${amountUnit} (${probability}${probabilityUnit})`
}

// Validate latitude and longitude values
export const isValidCoordinates = (latitude: number, longitude: number): boolean => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  )
}

// Fetch weather data from Open-Meteo API
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
    url.searchParams.set('forecast_hours', '19') // Next 19 hours for hourly
    url.searchParams.set('forecast_days', '10') // Next 10 days for daily

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = (await response.json()) as WeatherApiResponse
    return data
  } catch (error) {
    throw new Error(`Failed to fetch weather data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Process and format weather data with units
export const processWeatherData = (data: WeatherApiResponse): ProcessedWeatherData => {
  // Process hourly data
  const hourlyData: Record<string, HourlyWeatherData> = {}
  const hourlyTimes = data.hourly.time
  const hourlyUnits = data.hourly_units

  hourlyTimes.forEach((time, index) => {
    hourlyData[time] = {
      temperature_2m: `${data.hourly.temperature_2m[index]}${hourlyUnits.temperature_2m}`,
      wind_speed_10m: `${data.hourly.wind_speed_10m[index]}${hourlyUnits.wind_speed_10m}`,
      precipitation_combined: formatPrecipitationCombined(
        data.hourly.precipitation?.[index] ?? 0,
        data.hourly.precipitation_probability?.[index] ?? 0,
        hourlyUnits.precipitation,
        hourlyUnits.precipitation_probability,
      ),
      apparent_temperature: `${data.hourly.apparent_temperature[index]}${hourlyUnits.apparent_temperature}`,
      dew_point_2m: `${data.hourly.dew_point_2m[index]}${hourlyUnits.dew_point_2m}`,
    }
  })

  // Process daily data
  const dailyData: Record<string, DailyWeatherData> = {}
  const dailyTimes = data.daily.time
  const dailyUnits = data.daily_units

  dailyTimes.forEach((time, index) => {
    dailyData[time] = {
      sunrise: data.daily.sunrise[index] ?? '', // ISO8601 format, no unit needed
      sunset: data.daily.sunset[index] ?? '', // ISO8601 format, no unit needed
      temperature_2m_max: `${data.daily.temperature_2m_max[index]}${dailyUnits.temperature_2m_max}`,
      precipitation_combined: formatPrecipitationCombined(
        data.daily.precipitation_sum?.[index] ?? 0,
        data.daily.precipitation_probability_max[index] ?? 0,
        dailyUnits.precipitation_sum,
        dailyUnits.precipitation_probability_max,
      ),
      sunshine_duration: formatSunshineDuration(data.daily.sunshine_duration?.[index] ?? 0),
      temperature_2m_min: `${data.daily.temperature_2m_min[index]}${dailyUnits.temperature_2m_min}`,
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

// Format weather data for display
export const formatWeatherData = (data: ProcessedWeatherData): string => {
  let result = `Weather Forecast for Location\n`
  result += `Coordinates: ${data.location.latitude}, ${data.location.longitude}\n`
  result += `Timezone: ${data.location.timezone} (${data.location.timezone_abbreviation})\n`
  result += `Elevation: ${data.location.elevation}m\n\n`

  // Format hourly data
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

  // Format daily data
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
