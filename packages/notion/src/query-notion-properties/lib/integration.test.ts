/**
 * Integration tests for the complete NotionSQL parser
 * Tests end-to-end functionality across all phases
 */

import { describe, expect, test, vi, beforeEach } from 'vitest'

import { NotionSQLParser, createNotionSQLParser, initializeNotionSQL } from './index'

import type { NotionSQLConfig } from './types'
import type { Client } from '@notionhq/client'

// Mock the Notion client
const mockNotionClient = {
  databases: {
    query: vi.fn(),
    retrieve: vi.fn(),
  },
  pages: {
    create: vi.fn(),
    update: vi.fn(),
    retrieve: vi.fn(),
  },
} as unknown as Client

const mockConfig: NotionSQLConfig = {
  client: mockNotionClient,
  debug: true,
  timeout: 5000,
  retries: 2,
  rateLimitDelay: 50,
}

describe('NotionSQL Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Parser Initialization', () => {
    test('should create parser with valid config', () => {
      const parser = new NotionSQLParser(mockConfig)
      expect(parser).toBeDefined()
      expect(parser.getConfig()).toEqual(mockConfig)
    })

    test('should create parser with factory function', () => {
      const parser = createNotionSQLParser(mockConfig)
      expect(parser).toBeDefined()
    })

    test('should create parser with initialization function', () => {
      const parser = initializeNotionSQL(mockConfig)
      expect(parser).toBeDefined()
    })

    test('should throw error for missing client', () => {
      expect(() => {
        new NotionSQLParser({ client: undefined as unknown as Client })
      }).toThrow('client is required')
    })
  })

  describe('SQL Validation', () => {
    let parser: NotionSQLParser

    beforeEach(() => {
      parser = new NotionSQLParser(mockConfig)
    })

    test('should validate simple SELECT query', () => {
      const result = parser.validateSQL('SELECT * FROM "test-db"')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should validate complex query with functions', () => {
      const sql = `
 SELECT Name, Priority, "Due Date"
 FROM "tasks-db"
 WHERE "Due Date" IN NEXT_WEEK()
 AND Assignee CONTAINS CURRENT_USER()
 AND LENGTH(Description) > 50
 ORDER BY Priority DESC
 LIMIT 10
 `
      const result = parser.validateSQL(sql)
      expect(result.valid).toBe(true)
    })

    test('should reject invalid SQL syntax', () => {
      const result = parser.validateSQL('INVALID SQL QUERY')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    test('should validate INSERT query', () => {
      const sql = `
 INSERT INTO "tasks-db" (Name, Priority, Tags, Assignee)
 VALUES ('New Task', 5, ['urgent', 'frontend'], ['@john@company.com'])
 `
      const result = parser.validateSQL(sql)
      expect(result.valid).toBe(true)
    })

    test('should validate UPDATE query with collection operations', () => {
      const sql = `
 UPDATE "projects-db"
 SET Tags = Tags + ['priority'], Team = Team - ['@former@company.com']
 WHERE Status = 'Active'
 `
      const result = parser.validateSQL(sql)
      expect(result.valid).toBe(true)
    })

    test('should validate UNDELETE query', () => {
      const sql = 'UNDELETE FROM "tasks-db" WHERE Tags CONTAINS "important"'
      const result = parser.validateSQL(sql)
      expect(result.valid).toBe(true)
    })

    test('should validate DESCRIBE query', () => {
      const sql = 'DESCRIBE "tasks-db" EXTENDED'
      const result = parser.validateSQL(sql)
      expect(result.valid).toBe(true)
    })
  })

  describe('Query Execution (Mocked)', () => {
    let parser: NotionSQLParser

    beforeEach(() => {
      parser = new NotionSQLParser(mockConfig)

      // Mock database schema
      mockNotionClient.databases.retrieve = vi.fn().mockResolvedValue({
        id: 'test-db',
        title: [{ plain_text: 'Test Database' }],
        properties: {
          Name: { type: 'title' },
          Priority: { type: 'number' },
          Status: { type: 'select', select: { options: [] } },
          Tags: { type: 'multi_select', multi_select: { options: [] } },
          'Due Date': { type: 'date' },
          Assignee: { type: 'people' },
        },
        created_time: '2023-12-01T10:00:00.000Z',
        last_edited_time: '2023-12-01T10:00:00.000Z',
        archived: false,
        url: 'https://notion.so/test-db',
      })

      // Mock query response
      mockNotionClient.databases.query = vi.fn().mockResolvedValue({
        results: [
          {
            id: 'page-1',
            created_time: '2023-12-01T10:00:00.000Z',
            last_edited_time: '2023-12-01T10:00:00.000Z',
            archived: false,
            url: 'https://notion.so/page-1',
            properties: {
              Name: {
                type: 'title',
                title: [{ text: { content: 'Test Task' } }],
              },
              Priority: {
                type: 'number',
                number: 5,
              },
              Status: {
                type: 'select',
                select: { name: 'TODO' },
              },
            },
          },
        ],
        has_more: false,
        next_cursor: null,
      })
    })

    test('should execute SELECT query', async () => {
      const result = await parser.query('SELECT * FROM "test-db"')

      expect(result.success).toBe(true)
      expect(result.operation).toBe('select')
      expect(result.results).toHaveLength(1)
      expect(result.results[0]).toHaveProperty('Name', 'Test Task')
      expect(result.results[0]).toHaveProperty('Priority', 5)
      expect(mockNotionClient.databases.query).toHaveBeenCalled()
    })

    test('should handle query timeout', async () => {
      // Make the query hang to test timeout
      mockNotionClient.databases.query = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 10000)))

      const result = await parser.query('SELECT * FROM "test-db"', {
        timeout: 100, // Very short timeout
      })

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('timeout')
    })

    test('should execute validation-only mode', async () => {
      const result = await parser.query('SELECT * FROM "test-db"', {
        validateOnly: true,
      })

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(0)
      expect(mockNotionClient.databases.query).not.toHaveBeenCalled()
    })
  })

  describe('Helper Methods', () => {
    let parser: NotionSQLParser

    beforeEach(() => {
      parser = new NotionSQLParser(mockConfig)

      // Mock responses for helper methods
      mockNotionClient.databases.query = vi.fn().mockResolvedValue({
        results: [],
        has_more: false,
        next_cursor: null,
      })

      mockNotionClient.databases.retrieve = vi.fn().mockResolvedValue({
        id: 'test-db',
        title: [{ plain_text: 'Test Database' }],
        properties: {
          Name: { type: 'title' },
          Priority: { type: 'number' },
        },
        created_time: '2023-12-01T10:00:00.000Z',
        last_edited_time: '2023-12-01T10:00:00.000Z',
        archived: false,
        url: 'https://notion.so/test-db',
      })
    })

    test('should execute select helper', async () => {
      await parser.select('test-db', {
        columns: ['Name', 'Priority'],
        where: { Status: 'TODO' },
        orderBy: [{ column: 'Priority', direction: 'DESC' }],
        limit: 10,
      })

      expect(mockNotionClient.databases.query).toHaveBeenCalled()
    })

    test('should execute describe helper', async () => {
      const result = await parser.describe('test-db', true)

      expect(result.success).toBe(true)
      expect(result.operation).toBe('describe')
      expect(mockNotionClient.databases.retrieve).toHaveBeenCalled()
    })

    test('should get query statistics', async () => {
      const stats = await parser.getQueryStats(`
 SELECT * FROM "test-db"
 WHERE Description LIKE '%urgent%'
 AND Projects ROLLUP_ANY(Status = 'Active')
 `)

      expect(stats).toHaveProperty('complexity')
      expect(stats).toHaveProperty('estimatedExecutionTime')
      expect(stats).toHaveProperty('warnings')
      expect(stats).toHaveProperty('suggestions')
      expect(stats.complexity).toBe('high') // Due to text search and rollup
    })
  })

  describe('Batch Operations', () => {
    let parser: NotionSQLParser

    beforeEach(() => {
      parser = new NotionSQLParser(mockConfig)

      // Mock successful responses
      mockNotionClient.databases.query = vi.fn().mockResolvedValue({
        results: [],
        has_more: false,
        next_cursor: null,
      })

      mockNotionClient.pages.create = vi.fn().mockResolvedValue({
        id: 'new-page',
        created_time: '2023-12-01T10:00:00.000Z',
        last_edited_time: '2023-12-01T10:00:00.000Z',
        archived: false,
        url: 'https://notion.so/new-page',
        properties: {},
      })

      mockNotionClient.databases.retrieve = vi.fn().mockResolvedValue({
        id: 'test-db',
        properties: {
          Name: { type: 'title' },
          Priority: { type: 'number' },
        },
      })
    })

    test('should execute batch queries', async () => {
      const queries = [
        'SELECT * FROM "test-db" WHERE Priority > 3',
        'SELECT Name FROM "test-db" ORDER BY Priority DESC',
      ]

      const results = await parser.batchQuery(queries, {
        continueOnError: true,
        maxConcurrency: 2,
      })

      expect(results).toHaveLength(2)
      expect(results.every((r) => r.success)).toBe(true)
    })

    test('should handle batch query errors', async () => {
      mockNotionClient.databases.query = vi
        .fn()
        .mockResolvedValueOnce({ results: [], has_more: false, next_cursor: null })
        .mockRejectedValueOnce(new Error('Database error'))

      const queries = ['SELECT * FROM "test-db"', 'SELECT * FROM "invalid-db"']

      const results = await parser.batchQuery(queries, {
        continueOnError: true,
      })

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
    })

    test('should execute transaction', async () => {
      const queries = [
        'INSERT INTO "test-db" (Name, Priority) VALUES ("Task 1", 5)',
        'INSERT INTO "test-db" (Name, Priority) VALUES ("Task 2", 3)',
      ]

      const result = await parser.transaction(queries)

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(2)
      expect(result.rollbackInfo).toBeUndefined()
    })

    test('should handle transaction failure', async () => {
      mockNotionClient.pages.create = vi
        .fn()
        .mockResolvedValueOnce({ id: 'page-1' })
        .mockRejectedValueOnce(new Error('Creation failed'))

      const queries = [
        'INSERT INTO "test-db" (Name, Priority) VALUES ("Task 1", 5)',
        'INSERT INTO "test-db" (Name, Priority) VALUES ("Invalid", "not-a-number")',
      ]

      const result = await parser.transaction(queries)

      expect(result.success).toBe(false)
      expect(result.rollbackInfo).toBeDefined()
    })
  })

  describe('User Context', () => {
    let parser: NotionSQLParser

    beforeEach(() => {
      parser = new NotionSQLParser(mockConfig)
    })

    test('should set and get user context', () => {
      const userContext = {
        userId: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        workspaceId: 'workspace-456',
      }

      parser.setUserContext(userContext)
      expect(parser.getUserContext()).toEqual(userContext)
    })

    test('should handle CURRENT_USER function with context', () => {
      parser.setUserContext({
        userId: 'user-123',
        email: 'user@example.com',
      })

      const result = parser.validateSQL('SELECT * FROM "test-db" WHERE Assignee CONTAINS CURRENT_USER()')

      expect(result.valid).toBe(true)
    })
  })

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const parser = new NotionSQLParser(mockConfig)
      const newConfig = { timeout: 10000, debug: false }

      parser.updateConfig(newConfig)
      const updatedConfig = parser.getConfig()

      expect(updatedConfig.timeout).toBe(10000)
      expect(updatedConfig.debug).toBe(false)
      expect(updatedConfig.client).toBe(mockConfig.client)
    })
  })

  describe('Error Handling', () => {
    let parser: NotionSQLParser

    beforeEach(() => {
      parser = new NotionSQLParser(mockConfig)
    })

    test('should handle database not found error', async () => {
      mockNotionClient.databases.retrieve = vi.fn().mockRejectedValue(new Error('Object not found'))

      const result = await parser.query('SELECT * FROM "non-existent-db"')

      expect(result.success).toBe(false)
      expect(result.error.code).toBe('DATABASE_NOT_FOUND')
    })

    test('should handle permission denied error', async () => {
      mockNotionClient.databases.query = vi.fn().mockRejectedValue(new Error('Permission denied'))

      mockNotionClient.databases.retrieve = vi.fn().mockResolvedValue({
        id: 'test-db',
        properties: { Name: { type: 'title' } },
      })

      const result = await parser.query('SELECT * FROM "test-db"')

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Permission denied')
    })

    test('should provide helpful error suggestions', async () => {
      const result = await parser.query('SELECT NonExistentColumn FROM "test-db"')

      expect(result.success).toBe(false)
      expect(result.error).toHaveProperty('suggestion')
    })
  })
})

describe('Configuration Validation', () => {
  test('should validate valid configuration', () => {
    const result = validateConfiguration(mockConfig)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('should detect missing client', () => {
    const result = validateConfiguration({
      client: undefined as unknown as Client,
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('client is required')
  })

  test('should warn about short timeout', () => {
    const result = validateConfiguration({
      ...mockConfig,
      timeout: 500,
    })
    expect(result.warnings).toContain('timeout below 1000ms may cause timeouts with Notion API')
  })
})

function validateConfiguration(config: NotionSQLConfig) {
  const errors: string[] = []
  const warnings: string[] = []

  if (!config.client) {
    errors.push('client is required')
  }

  if (config.timeout && config.timeout < 1000) {
    warnings.push('timeout below 1000ms may cause timeouts with Notion API')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
