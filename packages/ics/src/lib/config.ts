import { logger } from '@mcp-monorepo/shared'

import { type CalendarSource } from './types.js'

/**
 * Throws an error and logs a message when no ICS URLs are configured.
 */
function throwForNoIcsUrls(): never {
  const errorMessage =
    'No calendar sources configured. Please set environment variables starting with "CALENDAR_".\n' +
    'For example: CALENDAR_PRIVATE="https://your-calendar-url/basic.ics"'
  logger.error(errorMessage)
  throw new Error(errorMessage)
}

/**
 * Gets calendar sources from environment variables.
 * Variables should be prefixed with `CALENDAR_`.
 *
 * @returns An array of calendar sources.
 * @throws If no valid calendar sources are found or a URL is invalid.
 */
export const getIcsUrls = (): CalendarSource[] => {
  const envVars = process.env
  const calendarSources: CalendarSource[] = []

  Object.keys(envVars).forEach((key) => {
    const ENV_PREFIX = 'CALENDAR_'
    if (key.startsWith(ENV_PREFIX)) {
      const url = envVars[key]
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        const name = key.substring(ENV_PREFIX.length)
        calendarSources.push({ name, url })
      } else {
        throw new Error(`Invalid URL for environment variable ${key}: ${url}`)
      }
    }
  })

  if (calendarSources.length === 0) {
    throwForNoIcsUrls()
  }

  return calendarSources
}
