/**
 * Input validation helpers for SQL-to-Notion parser
 * Validates SQL syntax, property values, and Notion API constraints
 */

import { TYPE_INFERENCE_PATTERNS, SYSTEM_PROPERTIES, READ_ONLY_PROPERTIES } from './constants.js'
import { PropertyValidationError, TypeMismatchError, UnknownPropertyError } from './error-handling.js'
import { type PropertyType } from '../types/notion.js'

import type { SimplifiedPropertyValue } from '../types/index.js'

// SQL identifier validation
export function isValidSQLIdentifier(identifier: string): boolean {
  // Allow quoted identifiers and unquoted alphanumeric with underscores
  const quotedPattern = /^"[^"]+"$/
  const unquotedPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/

  return quotedPattern.test(identifier) || unquotedPattern.test(identifier)
}

// Clean SQL identifier (remove quotes if present)
export function cleanSQLIdentifier(identifier: string): string {
  if (identifier.startsWith('"') && identifier.endsWith('"')) {
    return identifier.slice(1, -1)
  }
  return identifier
}

// Database ID validation
export function isValidDatabaseId(id: string): boolean {
  // Notion database IDs are UUIDs with or without hyphens
  const uuidPattern = /^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/i
  return uuidPattern.test(id.replace(/-/g, ''))
}

// Page ID validation
export function isValidPageId(id: string): boolean {
  return isValidDatabaseId(id) // Same format as database IDs
}

// Property value type inference
export function inferPropertyType(value: unknown, columnName?: string): PropertyType {
  // Handle null/undefined
  if (value === undefined || value === null) {
    return 'rich_text' // Default to rich text for null values
  }

  // Handle arrays (collections)
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'multi_select' // Default for empty arrays
    }

    const firstValue = value[0]
    if (typeof firstValue === 'string') {
      // Check for special prefixes
      if (firstValue.startsWith('@')) {
        return 'people'
      } else if (firstValue.startsWith('#')) {
        return 'relation'
      } else if (TYPE_INFERENCE_PATTERNS.URL.test(firstValue)) {
        return 'files'
      } else {
        return 'multi_select'
      }
    }
    return 'multi_select'
  }

  // Handle primitives
  if (typeof value === 'boolean') {
    return 'checkbox'
  }

  if (typeof value === 'number') {
    return 'number'
  }

  if (typeof value === 'string') {
    // Check column name patterns first
    if (columnName) {
      const lowerColumnName = columnName.toLowerCase()
      if (lowerColumnName === 'name' || lowerColumnName === 'title') {
        return 'title'
      }
      if (lowerColumnName.includes('email')) {
        return 'email'
      }
      if (lowerColumnName.includes('phone')) {
        return 'phone_number'
      }
      if (lowerColumnName.includes('url') || lowerColumnName.includes('link')) {
        return 'url'
      }
    }

    // Check value patterns
    if (TYPE_INFERENCE_PATTERNS.EMAIL.test(value)) {
      return 'email'
    }
    if (TYPE_INFERENCE_PATTERNS.URL.test(value)) {
      return 'url'
    }
    if (TYPE_INFERENCE_PATTERNS.PHONE.test(value)) {
      return 'phone_number'
    }
    if (TYPE_INFERENCE_PATTERNS.DATE_ISO.test(value) || TYPE_INFERENCE_PATTERNS.DATETIME_ISO.test(value)) {
      return 'date'
    }
    if (TYPE_INFERENCE_PATTERNS.USER_REFERENCE.test(value)) {
      return 'people'
    }
    if (TYPE_INFERENCE_PATTERNS.PAGE_REFERENCE.test(value)) {
      return 'relation'
    }

    // Default to rich text
    return 'rich_text'
  }

  // Fallback to rich text
  return 'rich_text'
}

// Validate property value against expected type
export function validatePropertyValue(
  value: SimplifiedPropertyValue,
  expectedType: PropertyType,
  propertyName: string,
): void {
  if (value === undefined || value === null) {
    return // Null values are generally allowed
  }

  switch (expectedType) {
    case 'title':
    case 'rich_text':
    case 'url':
    case 'email':
    case 'phone_number':
    case 'select':
    case 'status':
      if (typeof value !== 'string') {
        throw new TypeMismatchError(propertyName, expectedType, typeof value, value)
      }
      break

    case 'number':
      if (typeof value !== 'number') {
        throw new TypeMismatchError(propertyName, expectedType, typeof value, value)
      }
      break

    case 'checkbox':
      if (typeof value !== 'boolean') {
        throw new TypeMismatchError(propertyName, expectedType, typeof value, value)
      }
      break

    case 'date':
      if (typeof value !== 'string') {
        throw new TypeMismatchError(propertyName, expectedType, typeof value, value)
      }
      // Validate date format
      if (!TYPE_INFERENCE_PATTERNS.DATE_ISO.test(value) && !TYPE_INFERENCE_PATTERNS.DATETIME_ISO.test(value)) {
        throw new PropertyValidationError(
          `Invalid date format for property '${propertyName}'. Use YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS format`,
          propertyName,
          value,
        )
      }
      break

    case 'multi_select':
    case 'people':
    case 'relation':
    case 'files':
      if (!Array.isArray(value)) {
        throw new TypeMismatchError(propertyName, expectedType, typeof value, value)
      }

      // Validate array elements
      for (const item of value) {
        if (typeof item !== 'string') {
          throw new PropertyValidationError(`All items in ${expectedType} array must be strings`, propertyName, item)
        }
      }
      break

    case 'formula':
    case 'rollup':
      throw new PropertyValidationError(
        `Cannot set value for computed property '${propertyName}' of type ${expectedType}`,
        propertyName,
        value,
      )

    case 'unique_id':
      throw new PropertyValidationError(
        `Cannot set value for auto-generated property '${propertyName}'`,
        propertyName,
        value,
      )
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  return TYPE_INFERENCE_PATTERNS.EMAIL.test(email)
}

// Validate URL format
export function isValidURL(url: string): boolean {
  return TYPE_INFERENCE_PATTERNS.URL.test(url)
}

// Validate phone number format
export function isValidPhoneNumber(phone: string): boolean {
  return TYPE_INFERENCE_PATTERNS.PHONE.test(phone)
}

// Validate date format
export function isValidDateString(date: string): boolean {
  return TYPE_INFERENCE_PATTERNS.DATE_ISO.test(date) || TYPE_INFERENCE_PATTERNS.DATETIME_ISO.test(date)
}

// Validate UUID format (for database/page IDs)
export function isValidUUID(uuid: string): boolean {
  return TYPE_INFERENCE_PATTERNS.UUID.test(uuid)
}

// Property name validation
export function validatePropertyName(name: string, availableProperties?: string[]): void {
  if (!name || name.trim() === '') {
    throw new PropertyValidationError('Property name cannot be empty')
  }

  // Check if property exists in available properties
  if (availableProperties && !availableProperties.includes(name)) {
    // Check if it's a system property
    if (!SYSTEM_PROPERTIES.includes(name as (typeof SYSTEM_PROPERTIES)[number])) {
      throw new UnknownPropertyError(name, availableProperties)
    }
  }
}

// Read-only property validation
export function validatePropertyWritability(propertyName: string, operation: 'insert' | 'update'): void {
  if (READ_ONLY_PROPERTIES.includes(propertyName as (typeof READ_ONLY_PROPERTIES)[number])) {
    throw new PropertyValidationError(`Cannot ${operation} read-only property '${propertyName}'`, propertyName)
  }
}

// Collection operation validation
export function validateCollectionOperation(operation: 'add' | 'remove' | 'replace', propertyType: PropertyType): void {
  const supportedTypes: PropertyType[] = ['multi_select', 'people', 'relation', 'files']

  if (!supportedTypes.includes(propertyType)) {
    throw new PropertyValidationError(
      `Collection operation '${operation}' not supported for property type '${propertyType}'`,
    )
  }
}

// Batch operation validation
export function validateBatchSize(size: number, maxSize = 100): void {
  if (size <= 0) {
    throw new PropertyValidationError('Batch size must be greater than 0')
  }

  if (size > maxSize) {
    throw new PropertyValidationError(`Batch size cannot exceed ${maxSize}`)
  }
}

// SQL injection prevention
export function sanitizeSQLString(value: string): string {
  // Basic SQL injection prevention
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

// Rate limiting validation
export function validateRateLimit(requestCount: number, timeWindow: number, limit = 3): void {
  if (requestCount > limit) {
    throw new PropertyValidationError(
      `Rate limit exceeded: ${requestCount} requests in ${timeWindow}ms (limit: ${limit})`,
    )
  }
}

// Pagination validation
export function validatePagination(pageSize?: number, cursor?: string): void {
  if (pageSize !== undefined) {
    if (pageSize <= 0 || pageSize > 100) {
      throw new PropertyValidationError('Page size must be between 1 and 100')
    }
  }

  if (cursor !== undefined && cursor !== '') {
    // Basic cursor validation (should be a valid cursor string)
    if (typeof cursor !== 'string' || cursor.length === 0) {
      throw new PropertyValidationError('Invalid pagination cursor')
    }
  }
}

// Value range validation
export function validateValueRange(value: number, min?: number, max?: number, propertyName?: string): void {
  if (min !== undefined && value < min) {
    throw new PropertyValidationError(
      `Value ${value} is below minimum ${min}${propertyName ? ` for property '${propertyName}'` : ''}`,
    )
  }

  if (max !== undefined && value > max) {
    throw new PropertyValidationError(
      `Value ${value} is above maximum ${max}${propertyName ? ` for property '${propertyName}'` : ''}`,
    )
  }
}

// String length validation
export function validateStringLength(value: string, maxLength?: number, propertyName?: string): void {
  if (maxLength !== undefined && value.length > maxLength) {
    throw new PropertyValidationError(
      `String length ${value.length} exceeds maximum ${maxLength}${propertyName ? ` for property '${propertyName}'` : ''}`,
    )
  }
}

// Array size validation
export function validateArraySize(value: unknown[], maxSize?: number, propertyName?: string): void {
  if (maxSize !== undefined && value.length > maxSize) {
    throw new PropertyValidationError(
      `Array length ${value.length} exceeds maximum ${maxSize}${propertyName ? ` for property '${propertyName}'` : ''}`,
    )
  }
}

// Comprehensive validation function
export function validatePropertyInput(
  propertyName: string,
  value: SimplifiedPropertyValue,
  expectedType: PropertyType,
  options?: {
    required?: boolean
    maxLength?: number
    maxArraySize?: number
    availableProperties?: string[]
  },
): void {
  // Check if property exists
  if (options?.availableProperties) {
    validatePropertyName(propertyName, options.availableProperties)
  }

  // Check if value is required
  if (options?.required && (value === undefined || value === null)) {
    throw new PropertyValidationError(`Property '${propertyName}' is required`, propertyName, value)
  }

  // Skip validation for null/undefined values if not required
  if (value === undefined || value === null) {
    return
  }

  // Type validation
  validatePropertyValue(value, expectedType, propertyName)

  // Additional constraints
  if (typeof value === 'string' && options?.maxLength) {
    validateStringLength(value, options.maxLength, propertyName)
  }

  if (Array.isArray(value) && options?.maxArraySize) {
    validateArraySize(value, options.maxArraySize, propertyName)
  }
}

// Export validation result type
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// Comprehensive input validation
export function validateInput(
  input: Record<string, SimplifiedPropertyValue>,
  schema?: Record<string, { type: PropertyType; required?: boolean }>,
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Validate each property
    for (const [propertyName, value] of Object.entries(input)) {
      const schemaEntry = schema?.[propertyName]

      if (schemaEntry) {
        validatePropertyInput(propertyName, value, schemaEntry.type, {
          required: schemaEntry.required,
        })
      } else if (schema) {
        warnings.push(`Property '${propertyName}' not found in schema`)
      }
    }

    // Check for missing required properties
    if (schema) {
      for (const [propertyName, schemaEntry] of Object.entries(schema)) {
        if (schemaEntry.required && !(propertyName in input)) {
          errors.push(`Required property '${propertyName}' is missing`)
        }
      }
    }
  } catch (error) {
    if (error instanceof PropertyValidationError) {
      errors.push(error.message)
    } else {
      errors.push(String(error))
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
