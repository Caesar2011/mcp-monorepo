/**
 * UPDATE operation handler
 * Handles page modification with collection operations and batch processing
 */

import { type Client } from '@notionhq/client'

import { convertWhereClauseToNotionFilter } from '../converters/filters.js'
import { convertSQLValueToNotionProperty } from '../converters/property-types.js'
import { createUpdateResult } from '../converters/response.js'
import { isReadOnlyProperty, isCollectionPropertyType } from '../utils/constants.js'
import {
  SQLParsingError,
  DatabaseNotFoundError,
  OperationFailedError,
  PropertyValidationError,
} from '../utils/error-handling.js'
import { inferPropertyType } from '../utils/validation.js'

import type {
  ResponseFormatConfig,
  SimplifiedPropertyValue,
  NotionSQLAST,
  SetClause,
  PropertyType,
  UpdateOperation,
  UpdateResult,
  UpdateSetClause,
  QueryContext,
} from '../types/index.js'
import type { UpdatePageParameters, QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints.js'

/**
 * Execute UPDATE operation
 */
export async function executeUpdateOperation(
  ast: NotionSQLAST,
  client: Client,
  _context?: QueryContext,
  config?: ResponseFormatConfig,
): Promise<UpdateResult> {
  const operation = convertASTToUpdateOperation(ast)

  try {
    const startTime = Date.now()
    let updatedPages: any[] = []
    let totalChanges: Record<string, SimplifiedPropertyValue> = {}

    if (operation.page_id) {
      // Direct page update
      const result = await executeDirectPageUpdate(operation, client)
      updatedPages = [result.page]
      totalChanges = result.changes
    } else if (operation.database_id) {
      // Database query + batch update
      const result = await executeDatabaseUpdate(operation, client)
      updatedPages = result.pages
      totalChanges = result.changes
    } else {
      throw new SQLParsingError('UPDATE requires either database ID with WHERE clause or page ID')
    }

    const executionTime = Date.now() - startTime

    // Convert response to simplified format
    const result = createUpdateResult(updatedPages, totalChanges, operation.database_id, operation.page_id, config)
    result.execution_time_ms = executionTime

    return result
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('database_id') || error.message.includes('not found')) {
        throw new DatabaseNotFoundError(operation.database_id || 'unknown')
      }
      if (error.message.includes('validation')) {
        throw new PropertyValidationError(error.message)
      }
      throw new OperationFailedError('UPDATE', error.message, { originalError: error })
    }
    throw new OperationFailedError('UPDATE', 'Unknown error occurred')
  }
}

/**
 * Convert AST to UPDATE operation
 */
function convertASTToUpdateOperation(ast: NotionSQLAST): UpdateOperation {
  if (!ast.set || ast.set.length === 0) {
    throw new SQLParsingError('UPDATE requires SET clause')
  }

  // Check if this is a direct page update
  const isPageUpdate = ast.table && ast.table.toUpperCase().startsWith('PAGE')

  let databaseId: string | undefined
  let pageId: string | undefined

  if (isPageUpdate) {
    // Extract page ID from "PAGE page-id" or "page-id"
    const pageMatch = ast.table?.match(/PAGE\s+["']?([^"'\s]+)["']?/i)
    if (pageMatch) {
      pageId = pageMatch[1]
    } else {
      pageId = (ast.table || '').replace(/^"|"$/g, '')
    }
  } else {
    databaseId = (ast.database || ast.table || '').replace(/^"|"$/g, '')

    if (!ast.where) {
      throw new SQLParsingError('UPDATE on database requires WHERE clause for safety')
    }
  }

  // Convert SET clauses
  const setClauses: UpdateSetClause[] = ast.set.map((clause) => {
    const operation = detectCollectionOperation(clause)

    return {
      property: clause.column,
      value: clause.value,
      operation,
    }
  })

  return {
    type: 'update',
    database_id: databaseId,
    page_id: pageId,
    sql: '', // Will be set by caller
    timestamp: new Date().toISOString(),
    set_clauses: setClauses,
    filter: ast.where,
    batch: !isPageUpdate, // Database updates are batch operations
  }
}

/**
 * Detect collection operation type from SET clause
 */
function detectCollectionOperation(setClause: SetClause): 'replace' | 'add' | 'remove' {
  // Check for collection math operations
  if (typeof setClause.value === 'string') {
    const value = setClause.value.toString()

    // Pattern: Tags = Tags + ['new']
    if (value.includes(setClause.column + ' +')) {
      return 'add'
    }

    // Pattern: Tags = Tags - ['old']
    if (value.includes(setClause.column + ' -')) {
      return 'remove'
    }
  }

  // Default to replace
  return 'replace'
}

/**
 * Execute direct page update
 */
async function executeDirectPageUpdate(
  operation: UpdateOperation,
  client: Client,
): Promise<{ page: any; changes: Record<string, SimplifiedPropertyValue> }> {
  if (!operation.page_id) {
    throw new SQLParsingError('Page ID is required for direct page update')
  }

  try {
    // Get current page to determine property types and current values
    const currentPage = await client.pages.retrieve({ page_id: operation.page_id })

    // Get database schema if the page belongs to a database
    const schema: Record<string, PropertyType> = {}
    if ('parent' in currentPage && currentPage.parent.type === 'database_id') {
      const database = await client.databases.retrieve({
        database_id: currentPage.parent.database_id,
      })

      if (database.properties) {
        for (const [name, property] of Object.entries(database.properties)) {
          schema[name] = property.type as PropertyType
        }
      }
    }

    // Build update properties
    const { properties, changes } = await buildUpdateProperties(operation.set_clauses, currentPage, schema, client)

    // Validate update properties
    validateUpdateProperties(properties, schema)

    // Execute update
    const updateParams: UpdatePageParameters = {
      page_id: operation.page_id,
      properties,
    }

    const updatedPage = await client.pages.update(updateParams)

    return {
      page: updatedPage,
      changes,
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new OperationFailedError('UPDATE', `Page '${operation.page_id}' not found`)
    }
    throw error
  }
}

/**
 * Execute database update (query + batch update)
 */
async function executeDatabaseUpdate(
  operation: UpdateOperation,
  client: Client,
): Promise<{ pages: any[]; changes: Record<string, SimplifiedPropertyValue> }> {
  if (!operation.database_id) {
    throw new SQLParsingError('Database ID is required for database update')
  }

  // Get database schema
  const database = await client.databases.retrieve({ database_id: operation.database_id })
  const schema: Record<string, PropertyType> = {}

  if (database.properties) {
    for (const [name, property] of Object.entries(database.properties)) {
      schema[name] = property.type as PropertyType
    }
  }

  // Query to find pages to update
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
    return { pages: [], changes: {} }
  }

  // Process updates in batches
  const updatedPages: any[] = []
  const batchSize = 10
  let totalChanges: Record<string, SimplifiedPropertyValue> = {}

  for (let i = 0; i < allPages.length; i += batchSize) {
    const batch = allPages.slice(i, i + batchSize)

    const batchPromises = batch.map(async (page) => {
      const { properties, changes } = await buildUpdateProperties(operation.set_clauses, page, schema, client)

      // Merge changes
      totalChanges = { ...totalChanges, ...changes }

      // Validate update properties
      validateUpdateProperties(properties, schema)

      // Execute update
      const updateParams: UpdatePageParameters = {
        page_id: page.id,
        properties,
      }

      return client.pages.update(updateParams)
    })

    const batchResults = await Promise.all(batchPromises)
    updatedPages.push(...batchResults)

    // Rate limiting delay
    if (i + batchSize < allPages.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  return {
    pages: updatedPages,
    changes: totalChanges,
  }
}

/**
 * Build update properties from SET clauses
 */
async function buildUpdateProperties(
  setClauses: UpdateSetClause[],
  currentPage: any,
  schema: Record<string, PropertyType>,
  client: Client,
): Promise<{ properties: Record<string, any>; changes: Record<string, SimplifiedPropertyValue> }> {
  const properties: Record<string, any> = {}
  const changes: Record<string, SimplifiedPropertyValue> = {}

  for (const clause of setClauses) {
    const { property, value, operation } = clause

    // Handle special properties
    if (property.toUpperCase() === 'ARCHIVED') {
      // Archive/unarchive operation
      const archived = Boolean(value)
      properties.archived = archived
      changes[property] = archived
      continue
    }

    // Handle ICON and COVER updates
    if (property.toUpperCase() === 'ICON' || property.toUpperCase() === 'COVER') {
      await handleSpecialPageProperty(property, value, currentPage.id, client)
      changes[property] = value
      continue
    }

    // Get property type
    let propertyType: PropertyType
    if (schema[property]) {
      propertyType = schema[property]
    } else {
      propertyType = inferPropertyType(value, property)
      console.warn(`Property '${property}' not found in schema, inferred type: ${propertyType}`)
    }

    // Handle collection operations
    if (operation !== 'replace' && isCollectionPropertyType(propertyType)) {
      const newValue = await handleCollectionOperation(property, value, operation, currentPage, propertyType)

      properties[property] = convertSQLValueToNotionProperty(newValue, propertyType, property)
      changes[property] = newValue
    } else {
      // Regular property update
      properties[property] = convertSQLValueToNotionProperty(value, propertyType, property)
      changes[property] = value
    }
  }

  return { properties, changes }
}

/**
 * Handle collection operations (add/remove)
 */
async function handleCollectionOperation(
  property: string,
  value: SimplifiedPropertyValue,
  operation: 'add' | 'remove',
  currentPage: any,
  propertyType: PropertyType,
): Promise<SimplifiedPropertyValue> {
  // Get current property value
  const currentProperty = currentPage.properties?.[property]
  let currentValue: SimplifiedPropertyValue = []

  if (currentProperty) {
    // Extract current values based on property type
    switch (propertyType) {
      case 'multi_select':
        currentValue = currentProperty.multi_select?.map((item: any) => item.name) || []
        break
      case 'people':
        currentValue = currentProperty.people?.map((person: any) => person.person?.email || person.id) || []
        break
      case 'relation':
        currentValue = currentProperty.relation?.map((rel: any) => rel.id) || []
        break
      case 'files':
        currentValue =
          currentProperty.files?.map((file: any) => file.external?.url || file.file?.url || file.name) || []
        break
    }
  }

  // Ensure arrays
  if (!Array.isArray(currentValue)) currentValue = []
  const newValue = Array.isArray(value) ? value : [value]

  // Perform operation
  switch (operation) {
    case 'add':
      const valuesToAdd = newValue.filter((v) => !currentValue.includes(v as never))
      return [...currentValue, ...valuesToAdd]

    case 'remove':
      return currentValue.filter((v) => !newValue.includes(v as never))

    default:
      return newValue
  }
}

/**
 * Handle special page properties (ICON, COVER)
 */
async function handleSpecialPageProperty(
  property: string,
  value: SimplifiedPropertyValue,
  pageId: string,
  client: Client,
): Promise<void> {
  const updateData: any = {}

  if (property.toUpperCase() === 'ICON') {
    if (value === null || value === undefined) {
      updateData.icon = null
    } else if (typeof value === 'string') {
      if (value.startsWith('http')) {
        updateData.icon = { type: 'external', external: { url: value } }
      } else {
        updateData.icon = { type: 'emoji', emoji: value }
      }
    }
  }

  if (property.toUpperCase() === 'COVER') {
    if (value === null || value === undefined) {
      updateData.cover = null
    } else if (typeof value === 'string' && value.startsWith('http')) {
      updateData.cover = { type: 'external', external: { url: value } }
    }
  }

  if (Object.keys(updateData).length > 0) {
    await client.pages.update({ page_id: pageId, ...updateData })
  }
}

/**
 * Validate update properties
 */
function validateUpdateProperties(properties: Record<string, any>, schema: Record<string, PropertyType>): void {
  for (const propertyName of Object.keys(properties)) {
    if (['archived', 'icon', 'cover'].includes(propertyName.toLowerCase())) {
      continue
    }

    if (isReadOnlyProperty(propertyName)) {
      throw new PropertyValidationError(`Cannot update read-only property '${propertyName}'`, propertyName)
    }

    const propertyType = schema[propertyName]
    if (propertyType && (propertyType === 'formula' || propertyType === 'rollup')) {
      throw new PropertyValidationError(
        `Cannot update computed property '${propertyName}' of type '${propertyType}'`,
        propertyName,
      )
    }
  }
}

/**
 * Validate UPDATE operation
 */
export function validateUpdateOperation(operation: UpdateOperation): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!operation.database_id && !operation.page_id) {
    errors.push('Either database ID or page ID is required')
  }

  if (!operation.set_clauses || operation.set_clauses.length === 0) {
    errors.push('SET clause is required')
  }

  if (operation.database_id && !operation.filter) {
    errors.push('WHERE clause is required for database updates')
  }

  return { valid: errors.length === 0, errors }
}
