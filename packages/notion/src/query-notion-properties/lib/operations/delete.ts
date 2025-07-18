/**
 * DELETE/UNDELETE operation handler
 * Handles page archiving/restoration (Notion doesn't support permanent deletion)
 */

import { type Client } from '@notionhq/client'
import { type UpdatePageParameters, type QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints.js'

import { convertWhereClauseToNotionFilter } from '../converters/filters.js'
import { createDeleteResult, createUndeleteResult } from '../converters/response.js'
import { DEFAULT_CONFIG } from '../utils/constants.js'
import {
  SQLParsingError,
  DatabaseNotFoundError,
  OperationFailedError,
  PropertyValidationError,
} from '../utils/error-handling.js'

import type {
  ResponseFormatConfig,
  NotionSQLAST,
  PropertyType,
  DeleteOperation,
  UndeleteOperation,
  DeleteResult,
  UndeleteResult,
  QueryContext,
} from '../types/index.js'

/**
 * Execute DELETE operation (archive pages)
 */
export async function executeDeleteOperation(
  ast: NotionSQLAST,
  client: Client,
  _context?: QueryContext,
  config?: ResponseFormatConfig,
): Promise<DeleteResult> {
  const operation = convertASTToDeleteOperation(ast)

  try {
    const startTime = Date.now()
    let archivedPages: any[] = []

    if (operation.page_id) {
      // Direct page archiving
      const result = await executeDirectPageArchive(operation.page_id, client)
      archivedPages = [result]
    } else if (operation.database_id) {
      // Database query + batch archive
      const result = await executeDatabaseArchive(operation, client)
      archivedPages = result
    } else {
      throw new SQLParsingError('DELETE requires either database ID with WHERE clause or page ID')
    }

    const executionTime = Date.now() - startTime

    // Convert response to simplified format
    const result = createDeleteResult(archivedPages, operation.database_id!, config)
    result.execution_time_ms = executionTime

    return result
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('database_id') || error.message.includes('not found')) {
        throw new DatabaseNotFoundError(operation.database_id || 'unknown')
      }
      throw new OperationFailedError('DELETE', error.message, { originalError: error })
    }
    throw new OperationFailedError('DELETE', 'Unknown error occurred')
  }
}

/**
 * Execute UNDELETE operation (restore pages)
 */
export async function executeUndeleteOperation(
  ast: NotionSQLAST,
  client: Client,
  _context?: QueryContext,
  config?: ResponseFormatConfig,
): Promise<UndeleteResult> {
  const operation = convertASTToUndeleteOperation(ast)

  try {
    const startTime = Date.now()
    let restoredPages: any[] = []

    if (operation.page_id) {
      // Direct page restoration
      const result = await executeDirectPageRestore(operation.page_id, client)
      restoredPages = [result]
    } else if (operation.database_id) {
      // Database query + batch restore
      const result = await executeDatabaseRestore(operation, client)
      restoredPages = result
    } else {
      throw new SQLParsingError('UNDELETE requires either database ID with WHERE clause or page ID')
    }

    const executionTime = Date.now() - startTime

    // Convert response to simplified format
    const result = createUndeleteResult(restoredPages, operation.database_id!, config)
    result.execution_time_ms = executionTime

    return result
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('database_id') || error.message.includes('not found')) {
        throw new DatabaseNotFoundError(operation.database_id || 'unknown')
      }
      throw new OperationFailedError('UNDELETE', error.message, { originalError: error })
    }
    throw new OperationFailedError('UNDELETE', 'Unknown error occurred')
  }
}

/**
 * Convert AST to DELETE operation
 */
function convertASTToDeleteOperation(ast: NotionSQLAST): DeleteOperation & { page_id?: string } {
  // Check if this is a direct page delete
  const isPageDelete = ast.table && ast.table.toUpperCase().startsWith('PAGE')

  let databaseId: string | undefined
  let pageId: string | undefined

  if (isPageDelete) {
    // Extract page ID from "PAGE page-id" or "page-id"
    const pageMatch = ast.table?.match(/PAGE\s+["']?([^"'\s]+)["']?/i)
    if (pageMatch) {
      pageId = pageMatch[1]
    } else {
      pageId = (ast.table || '').replace(/^"|"$/g, '')
    }
  } else {
    databaseId = (ast.database || ast.table || '').replace(/^"|"$/g, '')

    // Require WHERE clause for safety (unless FORCE is specified)
    if (!ast.where && !ast.force) {
      throw new SQLParsingError(
        'DELETE without WHERE clause not allowed for safety. Add WHERE clause or use FORCE flag.',
      )
    }
  }

  return {
    type: 'delete',
    database_id: databaseId!,
    sql: '', // Will be set by caller
    timestamp: new Date().toISOString(),
    filter: ast.where!,
    force: ast.force || false,
    archive_mode: true, // Always true for Notion (no permanent delete)
    page_id: pageId,
  }
}

/**
 * Convert AST to UNDELETE operation
 */
function convertASTToUndeleteOperation(ast: NotionSQLAST): UndeleteOperation & { page_id?: string } {
  // Check if this is a direct page restore
  const isPageRestore = ast.table && ast.table.toUpperCase().startsWith('PAGE')

  let databaseId: string | undefined
  let pageId: string | undefined

  if (isPageRestore) {
    // Extract page ID from "PAGE page-id"
    const pageMatch = ast.table?.match(/PAGE\s+["']?([^"'\s]+)["']?/i)
    if (pageMatch) {
      pageId = pageMatch[1]
    } else {
      pageId = (ast.table || '').replace(/^"|"$/g, '')
    }
  } else {
    databaseId = (ast.database || ast.table || '').replace(/^"|"$/g, '')

    if (!ast.where) {
      throw new SQLParsingError('UNDELETE requires WHERE clause to specify which pages to restore')
    }
  }

  return {
    type: 'undelete',
    database_id: databaseId!,
    sql: '', // Will be set by caller
    timestamp: new Date().toISOString(),
    filter: ast.where!,
    restore_mode: true,
    page_id: pageId,
  }
}

/**
 * Execute direct page archive
 */
async function executeDirectPageArchive(pageId: string, client: Client): Promise<any> {
  try {
    const updateParams: UpdatePageParameters = {
      page_id: pageId,
      archived: true,
    }

    return await client.pages.update(updateParams)
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new OperationFailedError('DELETE', `Page '${pageId}' not found`)
    }
    throw error
  }
}

/**
 * Execute direct page restore
 */
async function executeDirectPageRestore(pageId: string, client: Client): Promise<any> {
  try {
    const updateParams: UpdatePageParameters = {
      page_id: pageId,
      archived: false,
    }

    return await client.pages.update(updateParams)
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new OperationFailedError('UNDELETE', `Page '${pageId}' not found`)
    }
    throw error
  }
}

/**
 * Execute database archive (query + batch archive)
 */
async function executeDatabaseArchive(operation: DeleteOperation, client: Client): Promise<any[]> {
  if (!operation.database_id) {
    throw new SQLParsingError('Database ID is required for database archive')
  }

  // Get database schema for filter conversion
  const schema = await getDatabaseSchema(operation.database_id, client)

  // Query to find pages to archive
  const queryParams: QueryDatabaseParameters = {
    database_id: operation.database_id,
  }

  if (operation.filter) {
    queryParams.filter = convertWhereClauseToNotionFilter(operation.filter, schema)
  }

  // Get all matching pages (handle pagination)
  const allPages: any[] = []
  let hasMore = true
  let startCursor: string | undefined

  while (hasMore) {
    if (startCursor) {
      queryParams.start_cursor = startCursor
    }

    const response = await client.databases.query(queryParams)
    allPages.push(...response.results)

    hasMore = response.has_more
    startCursor = response.next_cursor || undefined
  }

  if (allPages.length === 0) {
    return []
  }

  // Safety check for mass deletion
  const warningThreshold = 50
  if (allPages.length > warningThreshold && !operation.force) {
    throw new PropertyValidationError(
      `DELETE would archive ${allPages.length} pages. Add FORCE flag to confirm this operation.`,
    )
  }

  // Process archives in batches with rate limiting
  return await processBatchArchive(allPages, true, client)
}

/**
 * Execute database restore (query + batch restore)
 */
async function executeDatabaseRestore(operation: UndeleteOperation, client: Client): Promise<any[]> {
  if (!operation.database_id) {
    throw new SQLParsingError('Database ID is required for database restore')
  }

  // Get database schema for filter conversion
  const schema = await getDatabaseSchema(operation.database_id, client)

  // Query to find pages to restore (include archived pages)
  const queryParams: QueryDatabaseParameters = {
    database_id: operation.database_id,
  }

  if (operation.filter) {
    const baseFilter = convertWhereClauseToNotionFilter(operation.filter, schema)

    // Ensure we're only looking at archived pages
    queryParams.filter = {
      and: [
        baseFilter,
        {
          _special: 'archived',
          condition: { equals: true },
        },
      ],
    }
  } else {
    // Default to only archived pages
    queryParams.filter = {
      _special: 'archived',
      condition: { equals: true },
    }
  }

  // Get all matching archived pages
  const allPages: any[] = []
  let hasMore = true
  let startCursor: string | undefined

  while (hasMore) {
    if (startCursor) {
      queryParams.start_cursor = startCursor
    }

    const response = await client.databases.query(queryParams)
    allPages.push(...response.results)

    hasMore = response.has_more
    startCursor = response.next_cursor || undefined
  }

  if (allPages.length === 0) {
    return []
  }

  // Process restores in batches with rate limiting
  return await processBatchArchive(allPages, false, client)
}

/**
 * Process batch archive/restore operations
 */
async function processBatchArchive(pages: any[], archive: boolean, client: Client): Promise<any[]> {
  const updatedPages: any[] = []
  const batchSize = DEFAULT_CONFIG.MAX_BATCH_SIZE
  const rateLimitDelay = DEFAULT_CONFIG.RATE_LIMIT_DELAY

  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize)

    const batchPromises = batch.map(async (page) => {
      const updateParams: UpdatePageParameters = {
        page_id: page.id,
        archived: archive,
      }

      return client.pages.update(updateParams)
    })

    const batchResults = await Promise.all(batchPromises)
    updatedPages.push(...batchResults)

    // Rate limiting delay between batches
    if (i + batchSize < pages.length) {
      await new Promise((resolve) => setTimeout(resolve, rateLimitDelay))
    }
  }

  return updatedPages
}

/**
 * Get database schema for filter conversion
 */
async function getDatabaseSchema(databaseId: string, client: Client): Promise<Record<string, PropertyType>> {
  try {
    const database = await client.databases.retrieve({ database_id: databaseId })
    const schema: Record<string, PropertyType> = {}

    if (database.properties) {
      for (const [name, property] of Object.entries(database.properties)) {
        schema[name] = property.type as PropertyType
      }
    }

    return schema
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new DatabaseNotFoundError(databaseId)
    }
    throw error
  }
}

/**
 * Count pages that would be affected by DELETE
 */
export async function getDeleteCount(operation: DeleteOperation, client: Client): Promise<number> {
  if (!operation.database_id) {
    return operation.page_id ? 1 : 0
  }

  // Get database schema
  const schema = await getDatabaseSchema(operation.database_id, client)

  // Query to count matching pages
  const queryParams: QueryDatabaseParameters = {
    database_id: operation.database_id,
    page_size: 1, // We only need the count
  }

  if (operation.filter) {
    queryParams.filter = convertWhereClauseToNotionFilter(operation.filter, schema)
  }

  let totalCount = 0
  let hasMore = true
  let startCursor: string | undefined

  // We need to paginate to get an accurate count
  // This is inefficient but Notion doesn't provide COUNT queries
  while (hasMore) {
    if (startCursor) {
      queryParams.start_cursor = startCursor
    }

    const response = await client.databases.query(queryParams)
    totalCount += response.results.length

    hasMore = response.has_more
    startCursor = response.next_cursor || undefined

    // For performance, stop counting after a reasonable threshold
    if (totalCount > 1000) {
      return totalCount // Return estimated count
    }
  }

  return totalCount
}

/**
 * Validate DELETE operation
 */
export function validateDeleteOperation(operation: DeleteOperation): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!operation.database_id && !('page_id' in operation && operation.page_id)) {
    errors.push('Either database ID or page ID is required')
  }

  if (operation.database_id && !operation.filter && !operation.force) {
    errors.push('WHERE clause is required for database DELETE (or use FORCE flag)')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate UNDELETE operation
 */
export function validateUndeleteOperation(operation: UndeleteOperation): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!operation.database_id && !('page_id' in operation && operation.page_id)) {
    errors.push('Either database ID or page ID is required')
  }

  if (operation.database_id && !operation.filter) {
    errors.push('WHERE clause is required for database UNDELETE')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Build DELETE SQL from parameters
 */
export function buildDeleteSQL(options: {
  databaseId?: string
  pageId?: string
  where?: Record<string, any>
  force?: boolean
}): string {
  let sql: string

  if (options.pageId) {
    sql = `DELETE PAGE "${options.pageId}"`
  } else if (options.databaseId) {
    sql = `DELETE FROM "${options.databaseId}"`

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

    if (options.force) {
      sql += ' FORCE'
    }
  } else {
    throw new Error('Either databaseId or pageId is required')
  }

  return sql
}

/**
 * Build UNDELETE SQL from parameters
 */
export function buildUndeleteSQL(options: {
  databaseId?: string
  pageId?: string
  where?: Record<string, any>
}): string {
  let sql: string

  if (options.pageId) {
    sql = `UNDELETE PAGE "${options.pageId}"`
  } else if (options.databaseId) {
    sql = `UNDELETE FROM "${options.databaseId}"`

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
  } else {
    throw new Error('Either databaseId or pageId is required')
  }

  return sql
}

/**
 * Safe DELETE with confirmation
 */
export async function safeDelete(
  operation: DeleteOperation,
  client: Client,
  confirmationCallback?: (count: number) => Promise<boolean>,
): Promise<DeleteResult | { cancelled: true; reason: string }> {
  // Get count of pages that would be deleted
  const count = await getDeleteCount(operation, client)

  if (count === 0) {
    return {
      success: true,
      operation: 'delete',
      database_id: operation.database_id,
      archived_count: 0,
      results: [],
      execution_time_ms: 0,
      timestamp: new Date().toISOString(),
    }
  }

  // Ask for confirmation if callback provided
  if (confirmationCallback) {
    const confirmed = await confirmationCallback(count)
    if (!confirmed) {
      return {
        cancelled: true,
        reason: `User cancelled deletion of ${count} pages`,
      }
    }
  }

  // Proceed with deletion
  const ast = { filter: operation.filter, force: true } as NotionSQLAST
  return executeDeleteOperation(ast, client)
}
