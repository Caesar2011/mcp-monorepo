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
