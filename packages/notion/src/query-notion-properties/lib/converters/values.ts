/**
 * Value format converters for SQL values to Notion API format
 * Handles data transformation, validation, and special formatting
 */

import { TYPE_INFERENCE_PATTERNS } from '../utils/constants.js'
import { PropertyValidationError } from '../utils/error-handling.js'
import { isValidEmail, isValidURL, isValidDateString } from '../utils/validation.js'

import type { SimplifiedPropertyValue, PropertyType } from '../types/index.js'

/**
 * Convert SQL value to Notion-compatible format
 */
export function convertSQLValueToNotionFormat(
  value: SimplifiedPropertyValue,
  propertyType: PropertyType,
  propertyName: string,
): unknown {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    return getEmptyValueForType(propertyType)
  }

  switch (propertyType) {
    case 'title':
    case 'rich_text':
      return convertTextValue(value, propertyName)

    case 'number':
      return convertNumberValue(value, propertyName)

    case 'checkbox':
      return convertBooleanValue(value, propertyName)

    case 'select':
    case 'status':
      return convertSelectValue(value, propertyName)

    case 'multi_select':
      return convertMultiSelectValue(value, propertyName)

    case 'date':
      return convertDateValue(value, propertyName)

    case 'people':
      return convertPeopleValue(value, propertyName)

    case 'relation':
      return convertRelationValue(value, propertyName)

    case 'url':
      return convertURLValue(value, propertyName)

    case 'email':
      return convertEmailValue(value, propertyName)

    case 'phone_number':
      return convertPhoneValue(value, propertyName)

    case 'files':
      return convertFilesValue(value, propertyName)

    default:
      throw new PropertyValidationError(
        `Unsupported property type '${propertyType}' for value conversion`,
        propertyName,
        value,
      )
  }
}

/**
 * Convert Notion value to simplified SQL format
 */
export function convertNotionValueToSQLFormat(value: unknown, propertyType: PropertyType): SimplifiedPropertyValue {
  if (value === null || value === undefined) {
    return null
  }

  switch (propertyType) {
    case 'title':
    case 'rich_text':
    case 'url':
    case 'email':
    case 'phone_number':
      return String(value)

    case 'number':
      return typeof value === 'number' ? value : null

    case 'checkbox':
      return Boolean(value)

    case 'select':
    case 'status':
      return typeof value === 'string' ? value : null

    case 'multi_select':
    case 'people':
    case 'relation':
    case 'files':
      return Array.isArray(value) ? value : []

    case 'date':
      return typeof value === 'string' ? value : null

    default:
      return null
  }
}

// Individual value converters
function convertTextValue(value: SimplifiedPropertyValue, propertyName: string): string {
  if (typeof value !== 'string') {
    throw new PropertyValidationError(`Text property '${propertyName}' must be a string`, propertyName, value)
  }

  // Validate length (Notion has limits)
  if (value.length > 2000) {
    throw new PropertyValidationError(
      `Text property '${propertyName}' exceeds maximum length of 2000 characters`,
      propertyName,
      value,
    )
  }

  return value
}

function convertNumberValue(value: SimplifiedPropertyValue, propertyName: string): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new PropertyValidationError(`Number property '${propertyName}' must be finite`, propertyName, value)
    }
    return value
  }

  if (typeof value === 'string') {
    const numValue = Number(value)
    if (isNaN(numValue)) {
      throw new PropertyValidationError(
        `Cannot convert '${value}' to number for property '${propertyName}'`,
        propertyName,
        value,
      )
    }
    return numValue
  }

  throw new PropertyValidationError(
    `Number property '${propertyName}' must be a number or numeric string`,
    propertyName,
    value,
  )
}

function convertBooleanValue(value: SimplifiedPropertyValue, propertyName: string): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
      return true
    }
    if (['false', '0', 'no', 'off'].includes(lowerValue)) {
      return false
    }
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  throw new PropertyValidationError(`Boolean property '${propertyName}' must be true/false`, propertyName, value)
}

function convertSelectValue(value: SimplifiedPropertyValue, propertyName: string): string {
  if (typeof value !== 'string') {
    throw new PropertyValidationError(`Select property '${propertyName}' must be a string`, propertyName, value)
  }

  // Validate select option length
  if (value.length > 100) {
    throw new PropertyValidationError(`Select option '${value}' is too long (max 100 characters)`, propertyName, value)
  }

  return value
}

function convertMultiSelectValue(value: SimplifiedPropertyValue, propertyName: string): string[] {
  if (!Array.isArray(value)) {
    // Convert single value to array
    if (typeof value === 'string') {
      return [value]
    }
    throw new PropertyValidationError(
      `Multi-select property '${propertyName}' must be an array of strings`,
      propertyName,
      value,
    )
  }

  // Validate array elements
  const stringArray = value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new PropertyValidationError(
        `Multi-select property '${propertyName}' item ${index} must be a string`,
        propertyName,
        item,
      )
    }

    if (item.length > 100) {
      throw new PropertyValidationError(
        `Multi-select option '${item}' is too long (max 100 characters)`,
        propertyName,
        item,
      )
    }

    return item
  })

  // Validate array length
  if (stringArray.length > 100) {
    throw new PropertyValidationError(
      `Too many multi-select options for '${propertyName}' (max 100)`,
      propertyName,
      value,
    )
  }

  return stringArray
}

function convertDateValue(
  value: SimplifiedPropertyValue,
  propertyName: string,
): string | { start: string; end?: string } {
  if (typeof value !== 'string') {
    throw new PropertyValidationError(`Date property '${propertyName}' must be a string`, propertyName, value)
  }

  // Handle date ranges (e.g., "2023-12-01 -> 2023-12-15")
  if (value.includes(' -> ')) {
    const [start, end] = value.split(' -> ').map((d) => d.trim())

    if (!isValidDateString(start) || !isValidDateString(end)) {
      throw new PropertyValidationError(
        `Invalid date range format for '${propertyName}'. Use YYYY-MM-DD -> YYYY-MM-DD`,
        propertyName,
        value,
      )
    }

    return { start, end }
  }

  // Single date
  if (!isValidDateString(value)) {
    throw new PropertyValidationError(
      `Invalid date format for '${propertyName}'. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS`,
      propertyName,
      value,
    )
  }

  return value
}

function convertPeopleValue(value: SimplifiedPropertyValue, propertyName: string): string[] {
  if (!Array.isArray(value)) {
    // Convert single value to array
    if (typeof value === 'string') {
      return [convertSinglePersonValue(value, propertyName)]
    }
    throw new PropertyValidationError(
      `People property '${propertyName}' must be an array of user references`,
      propertyName,
      value,
    )
  }

  return value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new PropertyValidationError(
        `People property '${propertyName}' item ${index} must be a string`,
        propertyName,
        item,
      )
    }
    return convertSinglePersonValue(item, propertyName)
  })
}

function convertSinglePersonValue(value: string, propertyName: string): string {
  // Remove @ prefix if present
  const cleanValue = value.startsWith('@') ? value.slice(1) : value

  // Validate user reference format (email or UUID)
  if (!isValidEmail(cleanValue) && !TYPE_INFERENCE_PATTERNS.UUID.test(cleanValue)) {
    throw new PropertyValidationError(
      `Invalid user reference '${value}' for people property '${propertyName}'. Use email or user ID`,
      propertyName,
      value,
    )
  }

  return cleanValue
}

function convertRelationValue(value: SimplifiedPropertyValue, propertyName: string): string[] {
  if (!Array.isArray(value)) {
    // Convert single value to array
    if (typeof value === 'string') {
      return [convertSingleRelationValue(value, propertyName)]
    }
    throw new PropertyValidationError(
      `Relation property '${propertyName}' must be an array of page references`,
      propertyName,
      value,
    )
  }

  return value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new PropertyValidationError(
        `Relation property '${propertyName}' item ${index} must be a string`,
        propertyName,
        item,
      )
    }
    return convertSingleRelationValue(item, propertyName)
  })
}

function convertSingleRelationValue(value: string, propertyName: string): string {
  // Remove # prefix if present
  const cleanValue = value.startsWith('#') ? value.slice(1) : value

  // Validate page ID format (UUID)
  if (!TYPE_INFERENCE_PATTERNS.UUID.test(cleanValue)) {
    throw new PropertyValidationError(
      `Invalid page reference '${value}' for relation property '${propertyName}'. Use valid page ID`,
      propertyName,
      value,
    )
  }

  return cleanValue
}

function convertURLValue(value: SimplifiedPropertyValue, propertyName: string): string {
  if (typeof value !== 'string') {
    throw new PropertyValidationError(`URL property '${propertyName}' must be a string`, propertyName, value)
  }

  if (!isValidURL(value)) {
    throw new PropertyValidationError(`Invalid URL format for property '${propertyName}'`, propertyName, value)
  }

  return value
}

function convertEmailValue(value: SimplifiedPropertyValue, propertyName: string): string {
  if (typeof value !== 'string') {
    throw new PropertyValidationError(`Email property '${propertyName}' must be a string`, propertyName, value)
  }

  if (!isValidEmail(value)) {
    throw new PropertyValidationError(`Invalid email format for property '${propertyName}'`, propertyName, value)
  }

  return value
}

function convertPhoneValue(value: SimplifiedPropertyValue, propertyName: string): string {
  if (typeof value !== 'string') {
    throw new PropertyValidationError(`Phone property '${propertyName}' must be a string`, propertyName, value)
  }

  // More lenient phone validation - let Notion handle the specifics
  const cleanPhone = value.replace(/[^+\d]/g, '')

  if (cleanPhone.length < 7) {
    throw new PropertyValidationError(`Phone number too short for property '${propertyName}'`, propertyName, value)
  }

  return value // Return original format, let Notion validate
}

function convertFilesValue(value: SimplifiedPropertyValue, propertyName: string): string[] {
  if (!Array.isArray(value)) {
    // Convert single value to array
    if (typeof value === 'string') {
      return [convertSingleFileValue(value, propertyName)]
    }
    throw new PropertyValidationError(`Files property '${propertyName}' must be an array of URLs`, propertyName, value)
  }

  return value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new PropertyValidationError(
        `Files property '${propertyName}' item ${index} must be a string URL`,
        propertyName,
        item,
      )
    }
    return convertSingleFileValue(item, propertyName)
  })
}

function convertSingleFileValue(value: string, propertyName: string): string {
  if (!isValidURL(value)) {
    throw new PropertyValidationError(
      `Invalid file URL '${value}' for files property '${propertyName}'`,
      propertyName,
      value,
    )
  }

  return value
}

function getEmptyValueForType(propertyType: PropertyType): unknown {
  switch (propertyType) {
    case 'title':
    case 'rich_text':
    case 'url':
    case 'email':
    case 'phone_number':
    case 'select':
    case 'status':
      return ''

    case 'number':
      return null

    case 'checkbox':
      return false

    case 'multi_select':
    case 'people':
    case 'relation':
    case 'files':
      return []

    case 'date':
      return null

    default:
      return null
  }
}

/**
 * Sanitize value for SQL injection prevention
 */
export function sanitizeStringForSQL(value: string): string {
  return value
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/[\0\n\r\b\t]/g, (char) => {
      switch (char) {
        case '\0':
          return '\\0'
        case '\n':
          return '\\n'
        case '\r':
          return '\\r'
        case '\b':
          return '\\b'
        case '\t':
          return '\\t'
        default:
          return char
      }
    })
}

export function sanitizeValueForSQL(value: SimplifiedPropertyValue): SimplifiedPropertyValue {
  if (typeof value === 'string') {
    // Basic SQL injection prevention
    return sanitizeStringForSQL(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeStringForSQL(item))
  }

  return value
}

/**
 * Format value for display in error messages
 */
export function formatValueForDisplay(value: SimplifiedPropertyValue): string {
  if (value === null || value === undefined) {
    return 'null'
  }

  if (Array.isArray(value)) {
    return `[${value.map(formatValueForDisplay).join(', ')}]`
  }

  if (typeof value === 'string') {
    return `"${value}"`
  }

  return String(value)
}

/**
 * Validate value constraints
 */
export function validateValueConstraints(
  value: SimplifiedPropertyValue,
  propertyType: PropertyType,
  constraints?: {
    maxLength?: number
    maxArraySize?: number
    allowEmpty?: boolean
    customValidator?: (value: SimplifiedPropertyValue) => boolean
  },
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check if empty values are allowed
  if (!constraints?.allowEmpty && (value === null || value === undefined || value === '')) {
    errors.push('Empty values not allowed')
  }

  // Check string length
  if (typeof value === 'string' && constraints?.maxLength && value.length > constraints.maxLength) {
    errors.push(`Value exceeds maximum length of ${constraints.maxLength}`)
  }

  // Check array size
  if (Array.isArray(value) && constraints?.maxArraySize && value.length > constraints.maxArraySize) {
    errors.push(`Array exceeds maximum size of ${constraints.maxArraySize}`)
  }

  // Custom validation
  if (constraints?.customValidator && !constraints.customValidator(value)) {
    errors.push('Custom validation failed')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Batch convert multiple values
 */
export function batchConvertSQLValues(
  values: Record<string, SimplifiedPropertyValue>,
  propertyTypes: Record<string, PropertyType>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [propertyName, value] of Object.entries(values)) {
    const propertyType = propertyTypes[propertyName]

    if (!propertyType) {
      throw new PropertyValidationError(`No property type specified for '${propertyName}'`, propertyName, value)
    }

    result[propertyName] = convertSQLValueToNotionFormat(value, propertyType, propertyName)
  }

  return result
}
