/**
 * Tests for main type definitions and exports
 */

import { describe, expect, test } from 'vitest'

import { NotionSQLError, SQLParsingError, PropertyValidationError, NotionAPIError } from './index'

import type {
  SQLResult,
  SQLError,
  SQLOperation,
  NotionSQLConfig,
  SimplifiedPage,
  SimplifiedPropertyValue,
} from './index'

describe('Type Exports', () => {
  test('should export all required types', () => {
    // Test that types can be imported without errors
    const operations: SQLOperation[] = ['select', 'insert', 'update', 'delete', 'undelete', 'describe']
    expect(operations).toHaveLength(6)
  })
})

describe('SQLResult Type', () => {
  test('should have correct structure for success', () => {
    const result: SQLResult<SimplifiedPage> = {
      success: true,
      operation: 'select',
      database_id: 'test-db-id',
      count: 1,
      results: [
        {
          id: 'page-id',
          created_time: '2023-12-01T10:00:00.000Z',
          last_edited_time: '2023-12-01T10:00:00.000Z',
          archived: false,
          url: 'https://notion.so/page-id',
          Name: 'Test Page',
        },
      ],
      pagination: {
        has_more: false,
        next_cursor: null,
      },
    }

    expect(result.success).toBe(true)
    expect(result.operation).toBe('select')
    expect(result.results).toHaveLength(1)
  })
})

describe('SQLError Type', () => {
  test('should have correct structure for error', () => {
    const error: SQLError = {
      success: false,
      operation: 'select',
      error: {
        code: 'SQL_PARSING_ERROR',
        message: 'Invalid SQL syntax',
        details: { sql: 'INVALID SQL' },
        suggestion: 'Check your SQL syntax',
      },
    }

    expect(error.success).toBe(false)
    expect(error.error.code).toBe('SQL_PARSING_ERROR')
    expect(error.error.message).toBe('Invalid SQL syntax')
  })
})

describe('Error Classes', () => {
  test('NotionSQLError should work correctly', () => {
    const error = new NotionSQLError('TEST_ERROR', 'Test message', { test: 'data' })

    expect(error.code).toBe('TEST_ERROR')
    expect(error.message).toBe('Test message')
    expect(error.details).toEqual({ test: 'data' })
    expect(error.name).toBe('NotionSQLError')
  })

  test('SQLParsingError should extend NotionSQLError', () => {
    const error = new SQLParsingError('Invalid syntax', 'SELECT * FROM', 'Check table name')

    expect(error).toBeInstanceOf(NotionSQLError)
    expect(error.code).toBe('SQL_PARSING_ERROR')
    expect(error.sql).toBe('SELECT * FROM')
    expect(error.suggestion).toBe('Check table name')
  })

  test('PropertyValidationError should work correctly', () => {
    const error = new PropertyValidationError('Invalid property', 'Name', 'invalid-value')

    expect(error).toBeInstanceOf(NotionSQLError)
    expect(error.code).toBe('PROPERTY_VALIDATION_ERROR')
    expect(error.details).toEqual({ property: 'Name', value: 'invalid-value' })
  })

  test('NotionAPIError should work correctly', () => {
    const originalError = new Error('API Error')
    const error = new NotionAPIError('Notion API failed', originalError)

    expect(error).toBeInstanceOf(NotionSQLError)
    expect(error.code).toBe('NOTION_API_ERROR')
    expect(error.details?.originalError).toBe(originalError)
  })
})

describe('SimplifiedPropertyValue Type', () => {
  test('should accept valid property values', () => {
    const values: SimplifiedPropertyValue[] = ['string value', 42, true, ['array', 'of', 'strings'], null]

    expect(values).toHaveLength(5)
    expect(typeof values[0]).toBe('string')
    expect(typeof values[1]).toBe('number')
    expect(typeof values[2]).toBe('boolean')
    expect(Array.isArray(values[3])).toBe(true)
    expect(values[4]).toBeNull()
  })
})

describe('NotionSQLConfig Type', () => {
  test('should have required client field', () => {
    // This is a type-only test - if it compiles, the type is correct
    const config: Partial<NotionSQLConfig> = {
      debug: true,
      timeout: 5000,
      retries: 3,
      rateLimitDelay: 200,
    }

    expect(config.debug).toBe(true)
    expect(config.timeout).toBe(5000)
  })
})

describe('SimplifiedPage Type', () => {
  test('should have required system properties', () => {
    const page: SimplifiedPage = {
      id: 'page-id-123',
      created_time: '2023-12-01T10:00:00.000Z',
      last_edited_time: '2023-12-01T10:00:00.000Z',
      archived: false,
      url: 'https://notion.so/page-id-123',
      // Custom properties
      Name: 'Test Page',
      Priority: 5,
      Tags: ['urgent', 'frontend'],
      Completed: false,
    }

    // System properties
    expect(page.id).toBe('page-id-123')
    expect(page.created_time).toBe('2023-12-01T10:00:00.000Z')
    expect(page.archived).toBe(false)

    // Custom properties
    expect(page.Name).toBe('Test Page')
    expect(page.Priority).toBe(5)
    expect(page.Tags).toEqual(['urgent', 'frontend'])
    expect(page.Completed).toBe(false)
  })
})
