/**
 * SELECT operation handler
 * Handles database querying with filtering, sorting, and pagination
 */

import { type Client } from '@notionhq/client'
import {
  type QueryDatabaseParameters,
  type PropertyFilter,
  type TimestampCreatedTimeFilter,
  type TimestampLastEditedTimeFilter,
} from '@notionhq/client/build/src/api-endpoints.js'

import { convertWhereClauseToNotionFilter, combineFiltersWithAnd } from '../converters/filters.js'
import { convertQueryDatabaseResponse } from '../converters/response.js'
import { DEFAULT_CONFIG } from '../utils/constants.js'
import { SQLParsingError, DatabaseNotFoundError, OperationFailedError } from '../utils/error-handling.js'
import { validatePagination } from '../utils/validation.js'

import type {
  ResponseFormatConfig,
  NotionSQLAST,
  OrderByClause,
  LimitClause,
  PropertyType,
  SelectOperation,
  SelectResult,
  QueryContext,
} from '../types/index.js'

// Official Notion API filter type (union from @notionhq/client)
type NotionAPIFilter =
  | { or: NotionAPIFilter[] }
  | { and: NotionAPIFilter[] }
  | PropertyFilter
  | TimestampCreatedTimeFilter
  | TimestampLastEditedTimeFilter

// Official Notion API sort type
type NotionAPISort =
  | { property: string; direction: 'ascending' | 'descending' }
  | { timestamp: 'created_time' | 'last_edited_time'; direction: 'ascending' | 'descending' }

/**
 * Execute SELECT operation
 */
export async function executeSelectOperation(
  ast: NotionSQLAST,
  client: Client,
  context?: QueryContext,
  config?: ResponseFormatConfig,
): Promise<SelectResult> {
  const operation = convertASTToSelectOperation(ast)

  try {
    // Build Notion API query parameters
    const queryParams = await buildQueryParameters(operation, client, context)

    // Execute query
    const startTime = Date.now()
    const response = await client.databases.query(queryParams)
    const executionTime = Date.now() - startTime

    // Convert response to simplified format
    const result = convertQueryDatabaseResponse(response, config)
    result.execution_time_ms = executionTime

    // Apply column filtering if specified
    if (operation.columns !== '*' && operation.columns) {
      result.results = result.results.map((page) => filterPageColumns(page, operation.columns as string[]))
    }

    return result
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('database_id') || error.message.includes('not found')) {
        throw new DatabaseNotFoundError(operation.database_id)
      }
      throw new OperationFailedError('SELECT', error.message, { originalError: error })
    }
    throw new OperationFailedError('SELECT', 'Unknown error occurred')
  }
}

/**
 * Convert AST to SELECT operation
 */
function convertASTToSelectOperation(ast: NotionSQLAST): SelectOperation {
  if (!ast.table) {
    throw new SQLParsingError('SELECT requires FROM clause with database/table reference')
  }

  const databaseId = ast.table.replace(/^"|"$/g, '')

  return {
    type: 'select',
    database_id: databaseId,
    sql: '', // Will be set by caller
    timestamp: new Date().toISOString(),
    columns: ast.columns || '*',
    filter: ast.where,
    sorts: ast.orderby,
    limit: ast.limit ? extractLimitValue(ast.limit) : undefined,
    start_cursor: ast.limit ? extractCursorValue(ast.limit) : undefined,
    filter_properties: extractFilterProperties(ast),
  }
}

/**
 * Build Notion API query parameters
 */
async function buildQueryParameters(
  operation: SelectOperation,
  client: Client,
  _context?: QueryContext,
): Promise<QueryDatabaseParameters> {
  const params: QueryDatabaseParameters = {
    database_id: operation.database_id,
  }

  // Get database schema for property type information
  const schema = await getDatabaseSchema(operation.database_id, client)

  // Build filter - convert our WhereClause to official Notion filter
  if (operation.filter) {
    params.filter = convertWhereClauseToNotionFilter(operation.filter, schema.propertyTypes)
  }

  // Build sorts - convert our OrderByClause to official Notion sorts
  if (operation.sorts && operation.sorts.length > 0) {
    params.sorts = convertOrderByToNotionSorts(operation.sorts, schema.propertyTypes)
  }

  // Set pagination
  if (operation.limit) {
    validatePagination(operation.limit)
    params.page_size = Math.min(operation.limit, DEFAULT_CONFIG.MAX_PAGE_SIZE)
  } else {
    params.page_size = DEFAULT_CONFIG.DEFAULT_PAGE_SIZE
  }

  if (operation.start_cursor) {
    params.start_cursor = operation.start_cursor
  }

  // Set filter properties if specified
  if (operation.filter_properties && operation.filter_properties.length > 0) {
    params.filter_properties = operation.filter_properties
  }

  return params
}

/**
 * Get database schema information
 */
async function getDatabaseSchema(
  databaseId: string,
  client: Client,
): Promise<{ propertyTypes: Record<string, PropertyType> }> {
  try {
    const database = await client.databases.retrieve({ database_id: databaseId })
    const propertyTypes: Record<string, PropertyType> = {}

    if (database.properties) {
      for (const [name, property] of Object.entries(database.properties)) {
        propertyTypes[name] = property.type as PropertyType
      }
    }

    return { propertyTypes }
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new DatabaseNotFoundError(databaseId)
    }
    throw error
  }
}

/**
 * Convert ORDER BY clause to official Notion sorts
 */
function convertOrderByToNotionSorts(
  orderBy: OrderByClause[],
  propertyTypes: Record<string, PropertyType>,
): NotionAPISort[] {
  return orderBy.map((clause) => {
    const property = extractColumnName(clause.expr)

    if (!property) {
      throw new SQLParsingError('Invalid ORDER BY clause - unable to extract column name')
    }

    // Handle system properties
    if (property === 'created_time' || property === 'last_edited_time') {
      return {
        timestamp: property as 'created_time' | 'last_edited_time',
        direction: clause.type === 'DESC' ? 'descending' : 'ascending',
      }
    }

    // Validate property exists
    if (!propertyTypes[property]) {
      throw new SQLParsingError(`Unknown property '${property}' in ORDER BY clause`)
    }

    // Check if property is sortable
    if (!isSortableProperty(propertyTypes[property])) {
      throw new SQLParsingError(`Property '${property}' of type '${propertyTypes[property]}' is not sortable`)
    }

    return {
      property,
      direction: clause.type === 'DESC' ? 'descending' : 'ascending',
    }
  })
}

/**
 * Check if property type is sortable
 */
function isSortableProperty(propertyType: PropertyType): boolean {
  const sortableTypes: PropertyType[] = [
    'title',
    'rich_text',
    'number',
    'select',
    'date',
    'checkbox',
    'status',
    'unique_id',
  ]
  return sortableTypes.includes(propertyType)
}

/**
 * Extract column name from ORDER BY expression
 */
function extractColumnName(expr: unknown): string | undefined {
  if (typeof expr === 'object' && expr !== null && 'type' in expr && 'column' in expr) {
    // ColumnRef type
    return (expr as { type: string; column: string }).column
  }

  if (typeof expr === 'string') {
    return expr
  }

  if (typeof expr === 'object' && expr !== null && 'column' in expr) {
    return (expr as { column: string }).column
  }

  return undefined
}

/**
 * Extract LIMIT value from AST
 */
function extractLimitValue(limit: LimitClause): number | undefined {
  if (limit.value && Array.isArray(limit.value) && limit.value.length > 0) {
    const limitValue = limit.value[0]
    return typeof limitValue === 'number' ? limitValue : parseInt(String(limitValue), 10)
  }
  return undefined
}

/**
 * Extract cursor value from LIMIT clause (for OFFSET)
 */
function extractCursorValue(limit: LimitClause): string | undefined {
  if (limit.value && Array.isArray(limit.value) && limit.value.length > 1) {
    const cursorValue = limit.value[1]
    return typeof cursorValue === 'string' ? cursorValue : String(cursorValue)
  }
  return undefined
}

/**
 * Extract filter properties from AST
 */
function extractFilterProperties(ast: NotionSQLAST): string[] | undefined {
  // This would be extracted from a custom LIMIT PROPERTIES clause
  // For now, return undefined as it's an advanced feature
  return undefined
}

/**
 * Filter page to only include specified columns
 */
function filterPageColumns(page: Record<string, unknown>, columns: string[]): Record<string, unknown> {
  const filtered: Record<string, unknown> = {
    // Always include system properties
    id: page.id,
    created_time: page.created_time,
    last_edited_time: page.last_edited_time,
    archived: page.archived,
    url: page.url,
  }

  // Add requested columns
  for (const column of columns) {
    if (page[column] !== undefined) {
      filtered[column] = page[column]
    }
  }

  return filtered
}

/**
 * Execute SELECT with complex WHERE clause
 */
export async function executeComplexSelect(
  databaseId: string,
  columns: string[] | '*',
  filters: NotionAPIFilter[],
  sorts?: NotionAPISort[],
  limit?: number,
  startCursor?: string,
  client?: Client,
  config?: ResponseFormatConfig,
): Promise<SelectResult> {
  if (!client) {
    throw new OperationFailedError('SELECT', 'Notion client is required')
  }

  const queryParams: QueryDatabaseParameters = {
    database_id: databaseId,
  }

  // Combine multiple filters with AND
  if (filters.length > 0) {
    queryParams.filter = filters.length === 1 ? filters[0] : combineFiltersWithAnd(filters)
  }

  // Add sorts
  if (sorts && sorts.length > 0) {
    queryParams.sorts = sorts
  }

  // Add pagination
  if (limit) {
    queryParams.page_size = Math.min(limit, DEFAULT_CONFIG.MAX_PAGE_SIZE)
  }

  if (startCursor) {
    queryParams.start_cursor = startCursor
  }

  try {
    const startTime = Date.now()
    const response = await client.databases.query(queryParams)
    const executionTime = Date.now() - startTime

    const result = convertQueryDatabaseResponse(response, config)
    result.execution_time_ms = executionTime

    // Apply column filtering
    if (columns !== '*') {
      result.results = result.results.map((page) => filterPageColumns(page, columns as string[]))
    }

    return result
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('database_id') || error.message.includes('not found')) {
        throw new DatabaseNotFoundError(databaseId)
      }
      throw new OperationFailedError('SELECT', error.message, { originalError: error })
    }
    throw new OperationFailedError('SELECT', 'Unknown error occurred')
  }
}

/**
 * Execute paginated SELECT query
 */
export async function executePaginatedSelect(
  operation: SelectOperation,
  client: Client,
  maxPages: number = 10,
  config?: ResponseFormatConfig,
): Promise<SelectResult & { total_pages_fetched: number }> {
  const allResults: unknown[] = []
  let hasMore = true
  let cursor: string | undefined = operation.start_cursor
  let pagesFetched = 0
  let totalExecutionTime = 0

  while (hasMore && pagesFetched < maxPages) {
    // Create AST-like structure for executeSelectOperation
    const mockAST: NotionSQLAST = {
      type: 'select',
      table: operation.database_id,
      columns: operation.columns,
      where: operation.filter,
      orderby: operation.sorts,
      limit: operation.limit ? { value: [operation.limit], separator: '' } : undefined,
    }

    if (cursor) {
      if (mockAST.limit) {
        mockAST.limit.value = [operation.limit || 100, cursor]
      } else {
        mockAST.limit = { value: [100, cursor], separator: '' }
      }
    }

    const result = await executeSelectOperation(mockAST, client, undefined, config)

    allResults.push(...result.results)
    hasMore = result.pagination.has_more
    cursor = result.pagination.next_cursor
    pagesFetched++
    totalExecutionTime += result.execution_time_ms
  }

  const finalResult: SelectResult & { total_pages_fetched: number } = {
    success: true,
    operation: 'select',
    database_id: operation.database_id,
    count: allResults.length,
    results: allResults,
    pagination: {
      has_more: hasMore,
      next_cursor: cursor,
    },
    execution_time_ms: totalExecutionTime,
    timestamp: new Date().toISOString(),
    total_pages_fetched: pagesFetched,
  }

  return finalResult
}

/**
 * Get count of records matching criteria (estimate)
 */
export async function getSelectCount(operation: SelectOperation, client: Client): Promise<number> {
  // Since Notion doesn't have COUNT queries, we estimate by fetching first page
  const countOperation = {
    ...operation,
    limit: 1,
  }

  // Create mock AST for operation
  const mockAST: NotionSQLAST = {
    type: 'select',
    table: countOperation.database_id,
    columns: countOperation.columns,
    where: countOperation.filter,
    orderby: countOperation.sorts,
    limit: { value: [1], separator: '' },
  }

  const result = await executeSelectOperation(mockAST, client)

  // This is just an estimate - for accurate count, would need to fetch all pages
  if (result.pagination.has_more) {
    // Return a reasonable estimate
    return DEFAULT_CONFIG.MAX_PAGE_SIZE * 10 // Rough estimate
  }

  return result.count
}

/**
 * Validate SELECT operation
 */
export function validateSelectOperation(operation: SelectOperation): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!operation.database_id) {
    errors.push('Database ID is required')
  }

  if (operation.limit && operation.limit < 1) {
    errors.push('LIMIT must be greater than 0')
  }

  if (operation.limit && operation.limit > DEFAULT_CONFIG.MAX_PAGE_SIZE) {
    errors.push(`LIMIT cannot exceed ${DEFAULT_CONFIG.MAX_PAGE_SIZE}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Build SELECT query for specific use cases
 */
export function buildSelectQuery(options: {
  databaseId: string
  columns?: string[]
  where?: Record<string, unknown>
  orderBy?: Array<{ column: string; direction: 'ASC' | 'DESC' }>
  limit?: number
  offset?: string
}): string {
  let sql = `SELECT ${options.columns ? options.columns.join(', ') : '*'} FROM "${options.databaseId}"`

  if (options.where && Object.keys(options.where).length > 0) {
    const conditions = Object.entries(options.where)
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key} = '${value}'`
        }
        return `${key} = ${value}`
      })
      .join(' AND ')
    sql += ` WHERE ${conditions}`
  }

  if (options.orderBy && options.orderBy.length > 0) {
    const sorts = options.orderBy.map((sort) => `${sort.column} ${sort.direction}`).join(', ')
    sql += ` ORDER BY ${sorts}`
  }

  if (options.limit) {
    sql += ` LIMIT ${options.limit}`
    if (options.offset) {
      sql += ` OFFSET '${options.offset}'`
    }
  }

  return sql
}
