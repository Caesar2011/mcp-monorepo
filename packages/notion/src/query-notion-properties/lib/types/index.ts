/**
 * Consolidated type exports for the SQL-to-Notion parser library
 * Extends official @notionhq/client types where possible
 */

import type { Client } from '@notionhq/client'

// AST and parsing types
export * from './ast.js'

// Notion-specific extended types
export * from './notion.js'

// Operation-specific types
export * from './operations.js'

// Common utility types
export interface SQLResult<T = unknown> {
  success: boolean
  operation: SQLOperation
  database_id?: string
  page_id?: string
  count?: number
  results: T[]
  pagination?: {
    has_more: boolean
    next_cursor: string | null
  }
  execution_time_ms?: number
  timestamp?: string
}

export interface SQLError {
  success: false
  operation: SQLOperation
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
    sql?: string
    suggestion?: string
  }
}

export type SQLOperation = 'select' | 'insert' | 'update' | 'delete' | 'undelete' | 'describe'

export type SQLResponse<T = unknown> = SQLResult<T> | SQLError

// Configuration types
export interface NotionSQLConfig {
  client: Client
  debug?: boolean
  timeout?: number
  retries?: number
  rateLimitDelay?: number
}

export interface ResponseFormatConfig {
  includeEmptyProperties?: boolean
  includeSystemProperties?: boolean
  includeUrls?: boolean
  dateFormat?: 'iso8601' | 'locale'
  simplifyRelations?: boolean
  maxArrayItems?: number
}

// Property value types (simplified representations)
export type SimplifiedPropertyValue = string | number | boolean | string[] | null

export interface SimplifiedPage {
  id: string
  created_time: string
  last_edited_time: string
  archived: boolean
  url: string
  [propertyName: string]: SimplifiedPropertyValue | string
}

// Error type hierarchy
export class NotionSQLError extends Error {
  code: string
  details?: Record<string, unknown>
  sql?: string
  suggestion?: string

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'NotionSQLError'
    this.code = code
    this.details = details
  }
}

export class SQLParsingError extends NotionSQLError {
  constructor(message: string, sql?: string, suggestion?: string) {
    super('SQL_PARSING_ERROR', message)
    this.sql = sql
    this.suggestion = suggestion
  }
}

export class PropertyValidationError extends NotionSQLError {
  constructor(message: string, property?: string, value?: unknown) {
    super('PROPERTY_VALIDATION_ERROR', message, { property, value })
  }
}

export class NotionAPIError extends NotionSQLError {
  constructor(message: string, originalError?: unknown) {
    super('NOTION_API_ERROR', message, { originalError })
  }
}
