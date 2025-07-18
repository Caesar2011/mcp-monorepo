/**
 * Date function implementations for Notion SQL queries
 * Converts date function placeholders to Notion API filter objects
 */

import { PropertyValidationError } from '../utils/error-handling.js'

import type { DateFilter } from '../types/notion.js'

/**
 * Date function names supported by Notion
 */
export type DateFunctionName =
  | 'NEXT_WEEK'
  | 'NEXT_MONTH'
  | 'NEXT_YEAR'
  | 'PAST_WEEK'
  | 'PAST_MONTH'
  | 'PAST_YEAR'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'THIS_YEAR'
  | 'TODAY'
  | 'NOW'

/**
 * Date arithmetic function names
 */
export type DateArithmeticFunction = 'DATE_ADD' | 'DATE_SUB'

/**
 * Date part extraction function names
 */
export type DatePartFunction = 'YEAR' | 'MONTH' | 'DAY' | 'WEEKDAY'

/**
 * All date function types
 */
export type AllDateFunctions = DateFunctionName | DateArithmeticFunction | DatePartFunction

/**
 * Date arithmetic interval types
 */
export type DateInterval = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'HOUR' | 'MINUTE'

/**
 * Convert date function placeholder to Notion date filter
 */
export function convertDateFunctionToFilter(functionName: string): DateFilter {
  const cleanName = functionName.replace(/^__|__$/g, '') as DateFunctionName

  switch (cleanName) {
    // Next period functions
    case 'NEXT_WEEK':
      return { next_week: {} }
    case 'NEXT_MONTH':
      return { next_month: {} }
    case 'NEXT_YEAR':
      return { next_year: {} }

    // Past period functions
    case 'PAST_WEEK':
      return { past_week: {} }
    case 'PAST_MONTH':
      return { past_month: {} }
    case 'PAST_YEAR':
      return { past_year: {} }

    // Current period functions
    case 'THIS_WEEK':
      return { this_week: {} }

    // Absolute date functions
    case 'TODAY':
      return { equals: getCurrentDateString() }
    case 'NOW':
      return { equals: getCurrentDateTimeString() }

    default:
      throw new PropertyValidationError(`Unknown date function: ${functionName}`, 'date_function', functionName)
  }
}

/**
 * Convert date function name to a comparable value for filters
 */
export function convertDateFunctionToValue(functionName: string): string {
  const cleanName = functionName.replace(/^__|__$/g, '') as DateFunctionName

  switch (cleanName) {
    case 'TODAY':
      return getCurrentDateString()
    case 'NOW':
      return getCurrentDateTimeString()
    default:
      // For relative functions, we return a special marker that will be
      // handled by the filter converter
      return `__${cleanName}__`
  }
}

/**
 * Check if a string represents a date function
 */
export function isDateFunction(value: string): boolean {
  if (typeof value !== 'string') return false

  const cleanValue = value.replace(/^__|__$/g, '')
  const dateFunctions: string[] = [
    'NEXT_WEEK',
    'NEXT_MONTH',
    'NEXT_YEAR',
    'PAST_WEEK',
    'PAST_MONTH',
    'PAST_YEAR',
    'THIS_WEEK',
    'THIS_MONTH',
    'THIS_YEAR',
    'TODAY',
    'NOW',
  ]

  return dateFunctions.includes(cleanValue)
}

/**
 * Handle date arithmetic functions (DATE_ADD, DATE_SUB)
 */
export function processDateArithmetic(
  functionName: DateArithmeticFunction,
  baseDate: string | Date,
  interval: number,
  unit: DateInterval,
): string {
  const date = typeof baseDate === 'string' ? new Date(baseDate) : baseDate

  if (isNaN(date.getTime())) {
    throw new PropertyValidationError(`Invalid date for ${functionName}: ${baseDate}`, 'date_arithmetic', baseDate)
  }

  const multiplier = functionName === 'DATE_ADD' ? 1 : -1
  const adjustedInterval = interval * multiplier

  switch (unit) {
    case 'MINUTE':
      date.setMinutes(date.getMinutes() + adjustedInterval)
      break
    case 'HOUR':
      date.setHours(date.getHours() + adjustedInterval)
      break
    case 'DAY':
      date.setDate(date.getDate() + adjustedInterval)
      break
    case 'WEEK':
      date.setDate(date.getDate() + adjustedInterval * 7)
      break
    case 'MONTH':
      date.setMonth(date.getMonth() + adjustedInterval)
      break
    case 'YEAR':
      date.setFullYear(date.getFullYear() + adjustedInterval)
      break
    default:
      throw new PropertyValidationError(`Unsupported date interval: ${unit}`, 'date_interval', unit)
  }

  return date.toISOString()
}

/**
 * Extract date parts (YEAR, MONTH, DAY, WEEKDAY)
 */
export function extractDatePart(functionName: DatePartFunction, dateValue: string | Date): number | string {
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue

  if (isNaN(date.getTime())) {
    throw new PropertyValidationError(`Invalid date for ${functionName}: ${dateValue}`, 'date_part', dateValue)
  }

  switch (functionName) {
    case 'YEAR':
      return date.getFullYear()
    case 'MONTH':
      return date.getMonth() + 1 // JavaScript months are 0-based
    case 'DAY':
      return date.getDate()
    case 'WEEKDAY':
      return getWeekdayName(date.getDay())
    default:
      throw new PropertyValidationError(`Unsupported date part function: ${functionName}`, 'date_part', functionName)
  }
}

/**
 * Parse date arithmetic SQL expression
 * Example: "DATE_ADD(NOW(), INTERVAL 7 DAY)"
 */
export function parseDateArithmeticExpression(expression: string): {
  function: DateArithmeticFunction
  baseDate: string
  interval: number
  unit: DateInterval
} {
  const regex = /(DATE_ADD|DATE_SUB)\s*\(\s*([^,]+)\s*,\s*INTERVAL\s+(\d+)\s+(\w+)\s*\)/i
  const match = expression.match(regex)

  if (!match) {
    throw new PropertyValidationError(
      `Invalid date arithmetic expression: ${expression}`,
      'date_arithmetic',
      expression,
    )
  }

  const functionName = match[1].toUpperCase() as DateArithmeticFunction
  const baseDate = match[2].trim()
  const interval = parseInt(match[3], 10)
  const unit = match[4].toUpperCase() as DateInterval

  return { function: functionName, baseDate, interval, unit }
}

/**
 * Parse date part extraction SQL expression
 * Example: "YEAR('2023-12-01')"
 */
export function parseDatePartExpression(expression: string): {
  function: DatePartFunction
  dateValue: string
} {
  const regex = /(YEAR|MONTH|DAY|WEEKDAY)\s*\(\s*([^)]+)\s*\)/i
  const match = expression.match(regex)

  if (!match) {
    throw new PropertyValidationError(`Invalid date part expression: ${expression}`, 'date_part', expression)
  }

  const functionName = match[1].toUpperCase() as DatePartFunction
  const dateValue = match[2].trim().replace(/^["']|["']$/g, '') // Remove quotes

  return { function: functionName, dateValue }
}

/**
 * Get date range for relative date functions
 */
export function getDateRange(functionName: DateFunctionName): {
  start: string
  end: string
} {
  const now = new Date()
  let start: Date
  let end: Date

  switch (functionName) {
    case 'THIS_WEEK':
      start = getStartOfWeek(now)
      end = getEndOfWeek(now)
      break
    case 'THIS_MONTH':
      start = getStartOfMonth(now)
      end = getEndOfMonth(now)
      break
    case 'THIS_YEAR':
      start = getStartOfYear(now)
      end = getEndOfYear(now)
      break
    case 'NEXT_WEEK':
      start = getStartOfWeek(addDays(now, 7))
      end = getEndOfWeek(addDays(now, 7))
      break
    case 'NEXT_MONTH':
      start = getStartOfMonth(addMonths(now, 1))
      end = getEndOfMonth(addMonths(now, 1))
      break
    case 'NEXT_YEAR':
      start = getStartOfYear(addYears(now, 1))
      end = getEndOfYear(addYears(now, 1))
      break
    case 'PAST_WEEK':
      start = getStartOfWeek(addDays(now, -7))
      end = getEndOfWeek(addDays(now, -7))
      break
    case 'PAST_MONTH':
      start = getStartOfMonth(addMonths(now, -1))
      end = getEndOfMonth(addMonths(now, -1))
      break
    case 'PAST_YEAR':
      start = getStartOfYear(addYears(now, -1))
      end = getEndOfYear(addYears(now, -1))
      break
    default:
      throw new PropertyValidationError(
        `Cannot get date range for function: ${functionName}`,
        'date_range',
        functionName,
      )
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

// Utility functions for date manipulation
function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0]
}

function getCurrentDateTimeString(): string {
  return new Date().toISOString()
}

function getWeekdayName(dayIndex: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayIndex]
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getEndOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() + (6 - day)
  d.setDate(diff)
  d.setHours(23, 59, 59, 999)
  return d
}

function getStartOfMonth(date: Date): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

function getEndOfMonth(date: Date): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1, 0)
  d.setHours(23, 59, 59, 999)
  return d
}

function getStartOfYear(date: Date): Date {
  const d = new Date(date)
  d.setMonth(0, 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function getEndOfYear(date: Date): Date {
  const d = new Date(date)
  d.setMonth(11, 31)
  d.setHours(23, 59, 59, 999)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + years)
  return d
}

/**
 * Validate date function syntax
 */
export function validateDateFunction(functionName: string, args?: unknown[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!isDateFunction(functionName) && !isDateArithmeticFunction(functionName) && !isDatePartFunction(functionName)) {
    errors.push(`Unknown date function: ${functionName}`)
  }

  // Validate argument count for different function types
  if (isDateArithmeticFunction(functionName)) {
    if (!args || args.length !== 2) {
      errors.push(`${functionName} requires exactly 2 arguments (base_date, interval)`)
    }
  } else if (isDatePartFunction(functionName)) {
    if (!args || args.length !== 1) {
      errors.push(`${functionName} requires exactly 1 argument (date_value)`)
    }
  } else if (isDateFunction(functionName)) {
    if (args && args.length > 0) {
      errors.push(`${functionName} takes no arguments`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function isDateArithmeticFunction(name: string): boolean {
  return ['DATE_ADD', 'DATE_SUB'].includes(name.toUpperCase())
}

function isDatePartFunction(name: string): boolean {
  return ['YEAR', 'MONTH', 'DAY', 'WEEKDAY'].includes(name.toUpperCase())
}

/**
 * Get all supported date functions
 */
export function getSupportedDateFunctions(): {
  relative: DateFunctionName[]
  arithmetic: DateArithmeticFunction[]
  parts: DatePartFunction[]
} {
  return {
    relative: [
      'NEXT_WEEK',
      'NEXT_MONTH',
      'NEXT_YEAR',
      'PAST_WEEK',
      'PAST_MONTH',
      'PAST_YEAR',
      'THIS_WEEK',
      'THIS_MONTH',
      'THIS_YEAR',
      'TODAY',
      'NOW',
    ],
    arithmetic: ['DATE_ADD', 'DATE_SUB'],
    parts: ['YEAR', 'MONTH', 'DAY', 'WEEKDAY'],
  }
}
