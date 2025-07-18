/**
 * Error handling utilities for SQL-to-Notion parser
 * Provides user-friendly error messages and debugging information
 */

import { ERROR_CODES } from './constants.js'

import type { SQLError, SQLOperation } from '../types/index.js'

// Base error class for all SQL-to-Notion errors
export class NotionSQLBaseError extends Error {
  code: string
  details?: Record<string, unknown>
  sql?: string
  suggestion?: string
  timestamp: string

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'NotionSQLError'
    this.code = code
    this.details = details
    this.timestamp = new Date().toISOString()
  }

  toJSON(): SQLError {
    return {
      success: false,
      operation: 'select' as SQLOperation,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        sql: this.sql,
        suggestion: this.suggestion,
      },
    }
  }
}

// SQL parsing errors
export class SQLParsingError extends NotionSQLBaseError {
  constructor(message: string, sql?: string, suggestion?: string) {
    super(ERROR_CODES.SQL_PARSING_ERROR, message)
    this.sql = sql
    this.suggestion = suggestion
  }
}

// Property validation errors
export class PropertyValidationError extends NotionSQLBaseError {
  constructor(message: string, property?: string, value?: unknown) {
    super(ERROR_CODES.PROPERTY_VALIDATION_ERROR, message, { property, value })
    this.suggestion = `Check property name and value type for '${property}'`
  }
}

// Type mismatch errors
export class TypeMismatchError extends NotionSQLBaseError {
  constructor(property: string, expectedType: string, actualType: string, value?: unknown) {
    const message = `Property '${property}' expects type '${expectedType}' but received '${actualType}'`
    super(ERROR_CODES.TYPE_MISMATCH, message, { property, expectedType, actualType, value })
    this.suggestion = `Convert value to ${expectedType} or use a different property`
  }
}

// Unknown property errors
export class UnknownPropertyError extends NotionSQLBaseError {
  constructor(property: string, availableProperties?: string[]) {
    const message = `Unknown property '${property}'`
    super(ERROR_CODES.UNKNOWN_PROPERTY, message, { property, availableProperties })

    if (availableProperties?.length) {
      const suggestions = availableProperties
        .filter((p) => p.toLowerCase().includes(property.toLowerCase()))
        .slice(0, 3)

      if (suggestions.length > 0) {
        this.suggestion = `Did you mean: ${suggestions.join(', ')}?`
      } else {
        this.suggestion = `Available properties: ${availableProperties.slice(0, 5).join(', ')}${availableProperties.length > 5 ? '...' : ''}`
      }
    }
  }
}

// Read-only property errors
export class ReadOnlyPropertyError extends NotionSQLBaseError {
  constructor(property: string, operation: string) {
    const message = `Cannot ${operation} read-only property '${property}'`
    super(ERROR_CODES.READ_ONLY_PROPERTY, message, { property, operation })
    this.suggestion = `Remove '${property}' from ${operation.toUpperCase()} statement or use a different property`
  }
}

// Notion API errors
export class NotionAPIError extends NotionSQLBaseError {
  constructor(message: string, originalError?: unknown, statusCode?: number) {
    super(ERROR_CODES.NOTION_API_ERROR, message, { originalError, statusCode })

    if (statusCode === 404) {
      this.suggestion = 'Check database ID and integration permissions'
    } else if (statusCode === 403) {
      this.suggestion = 'Ensure integration has required permissions for this database'
    } else if (statusCode === 429) {
      this.suggestion = 'Rate limit exceeded. Reduce request frequency or add delays'
    }
  }
}

// Database not found errors
export class DatabaseNotFoundError extends NotionSQLBaseError {
  constructor(databaseId: string) {
    const message = `Database with ID '${databaseId}' not found or not accessible`
    super(ERROR_CODES.DATABASE_NOT_FOUND, message, { databaseId })
    this.suggestion = 'Check database ID format and integration permissions'
  }
}

// Operation failed errors
export class OperationFailedError extends NotionSQLBaseError {
  constructor(operation: string, reason: string, details?: Record<string, unknown>) {
    const message = `${operation} operation failed: ${reason}`
    super(ERROR_CODES.OPERATION_FAILED, message, details)
  }
}

// Error formatting functions
export function formatError(error: unknown, operation: SQLOperation = 'select', sql?: string): SQLError {
  const timestamp = new Date().toISOString()

  // Handle our custom errors
  if (error instanceof NotionSQLBaseError) {
    const result = error.toJSON()
    result.operation = operation
    return result
  }

  // Handle standard errors
  if (error instanceof Error) {
    return {
      success: false,
      operation,
      error: {
        code: ERROR_CODES.OPERATION_FAILED,
        message: error.message,
        details: {
          name: error.name,
          stack: error.stack,
          timestamp,
        },
        sql,
      },
    }
  }

  // Handle unknown errors
  return {
    success: false,
    operation,
    error: {
      code: ERROR_CODES.OPERATION_FAILED,
      message: 'An unknown error occurred',
      details: {
        error: String(error),
        timestamp,
      },
      sql,
    },
  }
}

// Error classification helpers
export function isNotionAPIError(error: unknown): error is NotionAPIError {
  return error instanceof NotionAPIError
}

export function isSQLParsingError(error: unknown): error is SQLParsingError {
  return error instanceof SQLParsingError
}

export function isPropertyValidationError(error: unknown): error is PropertyValidationError {
  return error instanceof PropertyValidationError
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof NotionAPIError) {
    const statusCode = error.details?.statusCode as number
    // Retry on rate limits, server errors, and network issues
    return statusCode === 429 || statusCode >= 500
  }
  return false
}

// Error message enhancement
export function enhanceErrorMessage(
  error: NotionSQLBaseError,
  context?: {
    operation?: string
    databaseId?: string
    sql?: string
    line?: number
    column?: number
  },
): NotionSQLBaseError {
  if (context?.sql) {
    error.sql = context.sql
  }

  if (context?.operation) {
    error.details = { ...error.details, operation: context.operation }
  }

  if (context?.databaseId) {
    error.details = { ...error.details, databaseId: context.databaseId }
  }

  if (context?.line !== undefined && context?.column !== undefined) {
    error.details = { ...error.details, position: { line: context.line, column: context.column } }
  }

  return error
}

// Debug information helpers
export function getDebugInfo(error: unknown): Record<string, unknown> {
  if (error instanceof NotionSQLBaseError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      sql: error.sql,
      suggestion: error.suggestion,
      timestamp: error.timestamp,
      stack: error.stack,
    }
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    error: String(error),
    type: typeof error,
  }
}

// User-friendly error messages
export const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  [ERROR_CODES.SQL_PARSING_ERROR]: 'Invalid SQL syntax. Please check your query and try again.',
  [ERROR_CODES.UNKNOWN_PROPERTY]: 'Property not found. Check the property name and database schema.',
  [ERROR_CODES.TYPE_MISMATCH]: 'Value type does not match property type. Please use the correct data type.',
  [ERROR_CODES.READ_ONLY_PROPERTY]: 'Cannot modify read-only property. Remove it from your query.',
  [ERROR_CODES.DATABASE_NOT_FOUND]: 'Database not found. Check the database ID and permissions.',
  [ERROR_CODES.PERMISSION_DENIED]: 'Permission denied. Ensure integration has required access.',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please wait and try again.',
  [ERROR_CODES.NOTION_API_ERROR]: 'Notion API error. Please check your connection and try again.',
}

export function getUserFriendlyMessage(errorCode: string): string {
  return USER_FRIENDLY_MESSAGES[errorCode] || 'An unexpected error occurred. Please try again.'
}

// Error recovery suggestions
export const ERROR_RECOVERY_SUGGESTIONS: Record<string, string[]> = {
  [ERROR_CODES.SQL_PARSING_ERROR]: [
    'Check SQL syntax for typos and missing quotes',
    'Ensure property names with spaces are quoted ("Property Name")',
    'Verify all parentheses and brackets are properly closed',
    'Check for unsupported SQL features',
  ],
  [ERROR_CODES.UNKNOWN_PROPERTY]: [
    'Use DESCRIBE "database-id" to see available properties',
    'Check property name spelling and capitalization',
    'Ensure property exists in the target database',
    'Use quotes around property names with spaces',
  ],
  [ERROR_CODES.TYPE_MISMATCH]: [
    'Check the expected data type for this property',
    'Convert your value to the correct format',
    'Use appropriate syntax for arrays and objects',
    'Refer to documentation for property type formats',
  ],
  [ERROR_CODES.DATABASE_NOT_FOUND]: [
    'Verify the database ID is correct',
    'Check integration permissions',
    'Ensure database is not archived',
    'Confirm integration is added to the database',
  ],
}

export function getRecoverySuggestions(errorCode: string): string[] {
  return (
    ERROR_RECOVERY_SUGGESTIONS[errorCode] || [
      'Check the documentation for help',
      'Verify your query syntax',
      'Ensure proper permissions are set',
    ]
  )
}

// Validation helper functions
export function validateSQLSyntax(sql: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Basic syntax checks
  if (!sql.trim()) {
    errors.push('SQL query cannot be empty')
  }

  // Check for balanced quotes
  const singleQuotes = (sql.match(/'/g) || []).length
  const doubleQuotes = (sql.match(/"/g) || []).length

  if (singleQuotes % 2 !== 0) {
    errors.push('Unmatched single quote in SQL query')
  }

  if (doubleQuotes % 2 !== 0) {
    errors.push('Unmatched double quote in SQL query')
  }

  // Check for balanced parentheses
  let parenCount = 0
  for (const char of sql) {
    if (char === '(') parenCount++
    if (char === ')') parenCount--
    if (parenCount < 0) {
      errors.push('Unmatched closing parenthesis in SQL query')
      break
    }
  }

  if (parenCount > 0) {
    errors.push('Unmatched opening parenthesis in SQL query')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function createDetailedError(
  error: unknown,
  context: {
    operation: SQLOperation
    sql?: string
    databaseId?: string
    additionalInfo?: Record<string, unknown>
  },
): SQLError {
  const baseError = formatError(error, context.operation, context.sql)

  // Add context information
  if (context.databaseId) {
    baseError.error.details = {
      ...baseError.error.details,
      databaseId: context.databaseId,
    }
  }

  if (context.additionalInfo) {
    baseError.error.details = {
      ...baseError.error.details,
      ...context.additionalInfo,
    }
  }

  return baseError
}
