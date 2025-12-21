import { DateTime, FixedOffsetZone } from 'luxon'

import { InvalidRruleError, TimeZoneDefinitionNotFoundError } from './errors.js'
import {
  type CalAddress,
  type Freq,
  type Geo,
  type IcsProperty,
  type RecurrenceRule,
  type TimeZoneResolver,
  type Weekday,
} from './types.js'

// --- Primitive & Simple Structure Parsers ---

/**
 * Extracts the raw string value from an ICS property.
 * @param prop - The ICS property.
 * @returns The string value or undefined.
 */
export function parseString(prop: IcsProperty | undefined): string | undefined {
  return prop?.value
}

/**
 * Parses the string value of an ICS property into an integer.
 * @param prop - The ICS property.
 * @returns The integer value or undefined if parsing fails.
 */
export function parseInteger(prop: IcsProperty | undefined): number | undefined {
  if (!prop?.value) return undefined
  const num = parseInt(prop.value, 10)
  return isNaN(num) ? undefined : num
}

/**
 * Parses one or more CATEGORIES properties into a flat array of category strings.
 * Handles comma-separated values within a single property.
 * @param props - An array of CATEGORIES properties.
 * @returns An array of category strings.
 */
export function parseCategories(props: IcsProperty[]): string[] {
  return props.flatMap((p) =>
    p.value
      .split(',')
      .map((cat) => cat.trim())
      .filter(Boolean),
  )
}

/**
 * Parses a GEO property value (e.g., '37.386013;-122.082932') into a structured Geo object.
 * @param prop - The GEO property.
 * @returns A Geo object or undefined if parsing fails.
 */
export function parseGeo(prop: IcsProperty | undefined): Geo | undefined {
  if (!prop?.value) return undefined
  const [lat, lon] = prop.value.split(';').map(parseFloat)
  if (isNaN(lat) || isNaN(lon)) return undefined
  return { lat, lon }
}

/**
 * Parses a calendar user address property (like ORGANIZER or ATTENDEE) into a structured CalAddress object,
 * extracting the email, common name, and other parameters.
 * @param prop - The ICS property for a calendar user.
 * @returns A CalAddress object or undefined.
 */
export function parseCalAddress(prop: IcsProperty | undefined): CalAddress | undefined {
  if (!prop?.value) return undefined
  return {
    email: prop.value.replace(/^mailto:/i, ''),
    commonName: prop.params['CN'],
    partstat: prop.params['PARTSTAT'],
    role: prop.params['ROLE'],
  }
}

// --- Date, Time & Offset Parsers ---

/**
 * Parses an iCalendar DATE-TIME or DATE property into a Luxon DateTime object.
 * Handles different formats, including date-only values, UTC time, and times with a TZID parameter.
 * It uses the provided timezone resolver for VTIMEZONE definitions and falls back to Luxon's
 * built-in IANA database for standard timezones.
 * @param prop - The IcsProperty containing the date value and parameters.
 * @param resolver - The optional timezone resolver for VTIMEZONE components.
 * @returns A Luxon DateTime object.
 */
export function parseIcsDateTime(prop: IcsProperty, resolver?: TimeZoneResolver): DateTime {
  const { value, params } = prop
  const tzid = params['TZID'] === 'Romance Standard Time' ? 'Europe/Paris' : params['TZID']
  const isDateOnly = params['VALUE'] === 'DATE'

  if (isDateOnly) {
    // For date-only values, parse as a date and treat it as local or in the specified zone's start of day.
    return DateTime.fromFormat(value, 'yyyyMMdd', { zone: tzid || 'local' })
  }

  if (value.endsWith('Z')) {
    // Value is explicitly in UTC.
    return DateTime.fromISO(value, { zone: 'utc' })
  }

  if (tzid && resolver) {
    try {
      const localDt = DateTime.fromFormat(value, "yyyyMMdd'T'HHmmss", { zone: 'local' })

      if (!localDt.isValid) return localDt

      const offsetMinutes = resolver(localDt, tzid)

      const zone = FixedOffsetZone.instance(offsetMinutes)
      return localDt.setZone(zone, { keepLocalTime: true })
    } catch (error) {
      if (!(error instanceof TimeZoneDefinitionNotFoundError)) {
        throw error // Re-throw unexpected errors.
      }
      // If a TimeZoneDefinitionNotFoundError is caught, it means the TZID was not in the VTIMEZONE components.
      // We fall through to let Luxon try and resolve it as a standard IANA timezone.
    }
  }

  if (tzid) {
    // Per RFC 5545, parse with the specified timezone identifier.
    // Fallback logic for standard IANA timezones (e.g., 'Europe/Paris') or when resolver fails.
    // Luxon handles DST gaps by rolling forward to the next valid time,
    // which correctly determines the absolute instant in time.
    return DateTime.fromFormat(value, "yyyyMMdd'T'HHmmss", { zone: tzid })
  }

  // A time without 'Z' or TZID is a "floating" time.
  // We parse it as local time according to the machine's settings.
  return DateTime.fromFormat(value, "yyyyMMdd'T'HHmmss", { zone: 'local' })
}

/**
 * Parses an iCalendar UTC offset string (e.g., "+0100" or "-0500") into minutes.
 * @param offsetString - The UTC offset string from a TZOFFSETFROM or TZOFFSETTO property.
 * @returns The offset in total minutes.
 */
export function parseOffset(offsetString: string): number {
  if (!/^[+-]\d{4}$/.test(offsetString)) {
    throw new Error(`Invalid offset string: ${offsetString}`)
  }
  const sign = offsetString.startsWith('-') ? -1 : 1
  const hours = parseInt(offsetString.substring(1, 3), 10)
  const minutes = parseInt(offsetString.substring(3, 5), 10)
  return sign * (hours * 60 + minutes)
}

/**
 * Parses a property containing a comma-separated list of date or date-time values
 * (e.g., from an RDATE or EXDATE property) into an array of Luxon DateTime objects.
 * @param prop - The IcsProperty containing the comma-separated date values.
 * @param resolver - The optional timezone resolver.
 * @returns An array of Luxon DateTime objects.
 */
export function parseDateTimeList(prop: IcsProperty, resolver?: TimeZoneResolver): DateTime[] {
  return prop.value.split(',').map((val) => parseIcsDateTime({ ...prop, value: val }, resolver))
}

// --- Rule Parsers ---

/**
 * Parses a raw RRULE string into a structured `RecurrenceRule` object, breaking
 * down its components like FREQ, UNTIL, BYDAY, etc..
 * @param rruleString - The raw value of the RRULE property.
 * @returns A structured RecurrenceRule object.
 */
export function parseRruleString(rruleString: string): RecurrenceRule {
  const parts = rruleString.split(';')
  const rule: Partial<RecurrenceRule> = {}
  for (const part of parts) {
    if (!part.includes('=')) continue
    const [key, value] = part.split('=')
    switch (key.toUpperCase()) {
      case 'FREQ': {
        const validFreqs = [
          'YEARLY',
          'MONTHLY',
          'WEEKLY',
          'DAILY',
          'HOURLY',
          'MINUTELY',
          'SECONDLY',
        ] as const satisfies Freq[]
        const freqValue = value.toUpperCase() as Freq
        if (!validFreqs.includes(freqValue)) {
          throw new InvalidRruleError(`Invalid FREQ value: ${value}`)
        }
        rule.freq = freqValue
        break
      }
      case 'INTERVAL':
        rule.interval = parseInt(value, 10)
        break
      case 'COUNT':
        rule.count = parseInt(value, 10)
        break
      case 'WKST':
        rule.wkst = value as Weekday
        break
      case 'UNTIL': {
        const isUtc = value.endsWith('Z')
        // RFC5545 states UNTIL MUST be a UTC date-time
        rule.until = DateTime.fromISO(value, { zone: isUtc ? 'utc' : 'local' }).toUTC()
        break
      }
      case 'BYDAY':
        rule.byday = value.split(',').map((day) => {
          const match = day.match(/([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)/)
          if (!match) throw new InvalidRruleError(`Invalid BYDAY value: ${day}`)
          const weekday = match[2] as Weekday
          const n = match[1] ? parseInt(match[1], 10) : undefined
          return { weekday, n }
        })
        break
      case 'BYMONTH':
        rule.bymonth = value.split(',').map((v) => parseInt(v, 10))
        break
      case 'BYMONTHDAY':
        rule.bymonthday = value.split(',').map((v) => parseInt(v, 10))
        break
      case 'BYYEARDAY':
        rule.byyearday = value.split(',').map((v) => parseInt(v, 10))
        break
      case 'BYWEEKNO':
        rule.byweekno = value.split(',').map((v) => parseInt(v, 10))
        break
      case 'BYHOUR':
        rule.byhour = value.split(',').map((v) => parseInt(v, 10))
        break
      case 'BYMINUTE':
        rule.byminute = value.split(',').map((v) => parseInt(v, 10))
        break
      case 'BYSECOND':
        rule.bysecond = value.split(',').map((v) => parseInt(v, 10))
        break
      case 'BYSETPOS':
        rule.bysetpos = value.split(',').map((v) => parseInt(v, 10))
        break
    }
  }
  if (!rule.freq) {
    throw new InvalidRruleError('RRULE string must contain a FREQ part.')
  }
  return rule as RecurrenceRule
}
