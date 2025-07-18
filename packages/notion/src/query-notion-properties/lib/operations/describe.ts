/**
 * DESCRIBE operation handler
 * Handles database schema introspection and metadata retrieval
 */

import { type Client, type GetDatabaseResponse } from '@notionhq/client/build/src/api-endpoints.js'

import { createDescribeResult } from '../converters/response.js'
import { SYSTEM_PROPERTIES } from '../utils/constants.js'
import { SQLParsingError, DatabaseNotFoundError, OperationFailedError } from '../utils/error-handling.js'

import type {
  NotionSQLAST,
  PropertyType,
  DatabasePropertySchema,
  DescribeOperation,
  DescribeResult,
  ColumnDefinition,
  MetaFieldDefinition,
  RelationshipDefinition,
  ComputedFieldDefinition,
  QueryContext,
} from '../types/index.js'

/**
 * Execute DESCRIBE operation
 */
export async function executeDescribeOperation(
  ast: NotionSQLAST,
  client: Client,
  _context?: QueryContext,
): Promise<DescribeResult> {
  const operation = convertASTToDescribeOperation(ast)

  try {
    const startTime = Date.now()

    // Get database schema from Notion API
    const database = await client.databases.retrieve({
      database_id: operation.database_id,
    })

    // Get additional statistics if requested
    let statistics = {
      total_pages: 0,
      archived_pages: 0,
      last_modified: getLastModifiedTime(database),
    }

    if (operation.extended) {
      statistics = await getDatabaseStatistics(operation.database_id, client)
    }

    const executionTime = Date.now() - startTime

    // Convert to describe result format
    const result = createDescribeResult(database, operation.extended)
    result.statistics = statistics
    result.execution_time_ms = executionTime

    // Apply column filtering if specified
    if (operation.filter_columns && operation.filter_columns.length > 0) {
      result.columns = result.columns.filter((col) => operation.filter_columns!.includes(col.name))
    }

    return result
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('database_id') || error.message.includes('not found')) {
        throw new DatabaseNotFoundError(operation.database_id)
      }
      throw new OperationFailedError('DESCRIBE', error.message, { originalError: error })
    }
    throw new OperationFailedError('DESCRIBE', 'Unknown error occurred')
  }
}

/**
 * Convert AST to DESCRIBE operation
 */
function convertASTToDescribeOperation(ast: NotionSQLAST): DescribeOperation {
  if (!ast.database && !ast.table) {
    throw new SQLParsingError('DESCRIBE requires database reference')
  }

  const databaseId = (ast.database || ast.table || '').replace(/^"|"$/g, '')

  // Check for EXTENDED flag
  const extended = ast.extended || false

  // Extract column filters from WHERE clause if present
  const filterColumns = extractColumnFilters(ast)

  return {
    type: 'describe',
    database_id: databaseId,
    sql: '', // Will be set by caller
    timestamp: new Date().toISOString(),
    extended,
    filter_columns: filterColumns,
    show_relationships: true,
    show_computed: true,
  }
}

/**
 * Extract column filters from WHERE clause
 */
function extractColumnFilters(ast: NotionSQLAST): string[] | undefined {
  // This would parse WHERE clauses like:
  // DESCRIBE "db" WHERE type = 'relation'
  // DESCRIBE "db" WHERE queryable = true
  // For now, return undefined as this is an advanced feature
  return undefined
}

/**
 * Get last modified time from database response
 */
function getLastModifiedTime(database: GetDatabaseResponse): string {
  // Handle both PartialDatabaseObjectResponse and DatabaseObjectResponse
  if ('last_edited_time' in database) {
    return database.last_edited_time
  }
  // Fallback to current time if not available
  return new Date().toISOString()
}

/**
 * Get database statistics (total pages, archived pages)
 */
async function getDatabaseStatistics(
  databaseId: string,
  client: Client,
): Promise<{ total_pages: number; archived_pages: number; last_modified: string }> {
  try {
    // Get total pages
    const totalResponse = await client.databases.query({
      database_id: databaseId,
      page_size: 1, // We only need the count
    })

    // Get archived pages
    const archivedResponse = await client.databases.query({
      database_id: databaseId,
      filter: {
        property: 'archived',
        checkbox: { equals: true },
      },
      page_size: 1,
    })

    // Note: This is a simplified implementation
    // For accurate counts, we'd need to paginate through all results
    return {
      total_pages: estimateCount(totalResponse),
      archived_pages: estimateCount(archivedResponse),
      last_modified: new Date().toISOString(),
    }
  } catch {
    // If we can't get statistics, return defaults
    return {
      total_pages: 0,
      archived_pages: 0,
      last_modified: new Date().toISOString(),
    }
  }
}

/**
 * Estimate count from query response
 */
function estimateCount(response: any): number {
  if (!response.has_more) {
    return response.results.length
  }

  // If there are more pages, estimate based on first page
  // This is not accurate but gives a reasonable estimate
  return response.results.length * 50 // Rough estimate
}

/**
 * Get detailed column information
 */
export function getColumnDetails(
  propertyName: string,
  property: DatabasePropertySchema,
  propertyType: PropertyType,
): ColumnDefinition {
  const baseColumn: ColumnDefinition = {
    name: propertyName,
    type: propertyType,
    nullable: propertyType !== 'title', // Title is usually required
    primary_key: propertyType === 'title',
    description: undefined,
    queryable: isQueryableProperty(propertyType),
    sortable: isSortableProperty(propertyType),
    filterable: isFilterableProperty(propertyType),
    updatable: isUpdatableProperty(propertyType),
    system_generated: false,
  }

  // Add type-specific metadata
  switch (propertyType) {
    case 'rich_text':
    case 'title':
      baseColumn.max_length = 2000
      break

    case 'number':
      if ('number' in property && property.number?.format) {
        baseColumn.format = property.number.format
      }
      break

    case 'select':
    case 'multi_select':
      if (propertyType in property && property[propertyType]?.options) {
        baseColumn.options = property[propertyType].options.map((opt: any) => ({
          name: opt.name,
          color: opt.color,
        }))
      }
      break

    case 'date':
      if ('date' in property && property.date) {
        baseColumn.format = 'ISO8601'
      }
      break

    case 'formula':
      if ('formula' in property && property.formula?.expression) {
        baseColumn.validation = property.formula.expression
      }
      baseColumn.system_generated = true
      baseColumn.updatable = false
      break

    case 'rollup':
      if ('rollup' in property && property.rollup) {
        baseColumn.validation = `${property.rollup.function}(${property.rollup.rollup_property_name})`
      }
      baseColumn.system_generated = true
      baseColumn.updatable = false
      break

    case 'unique_id':
      baseColumn.system_generated = true
      baseColumn.updatable = false
      break
  }

  return baseColumn
}

/**
 * Get meta field definitions (system properties)
 */
export function getMetaFields(): MetaFieldDefinition[] {
  return SYSTEM_PROPERTIES.map((prop) => ({
    name: prop,
    type: getSystemPropertyType(prop),
    description: getSystemPropertyDescription(prop),
    queryable: isSystemPropertyQueryable(prop),
    system_generated: true,
    read_only: isSystemPropertyReadOnly(prop),
    updatable: !isSystemPropertyReadOnly(prop),
    example: getSystemPropertyExample(prop),
    format: getSystemPropertyFormat(prop),
  }))
}

/**
 * Get relationship definitions from database properties
 */
export function getRelationships(properties: Record<string, any>): RelationshipDefinition[] {
  const relationships: RelationshipDefinition[] = []

  for (const [name, property] of Object.entries(properties)) {
    if (property.type === 'relation' && property.relation) {
      relationships.push({
        name,
        type: 'relation',
        target_database: property.relation.database_id,
        target_database_name: undefined, // Would need additional API call to get name
        target_property: property.relation.synced_property_name,
        cardinality: property.relation.type === 'single_property' ? 'one_to_many' : 'many_to_many',
        cascade_delete: false, // Notion doesn't support cascade delete
        bidirectional: property.relation.type === 'dual_property',
      })
    }
  }

  return relationships
}

/**
 * Get computed field definitions (formulas and rollups)
 */
export function getComputedFields(properties: Record<string, any>): ComputedFieldDefinition[] {
  const computedFields: ComputedFieldDefinition[] = []

  for (const [name, property] of Object.entries(properties)) {
    if (property.type === 'formula') {
      computedFields.push({
        name,
        type: 'formula',
        result_type: 'any', // Would need to analyze formula to determine exact type
        expression: property.formula?.expression,
        source_relation: undefined,
        source_property: undefined,
        aggregation: undefined,
        queryable: true,
        dependencies: extractFormulaDependencies(property.formula?.expression),
      })
    } else if (property.type === 'rollup') {
      computedFields.push({
        name,
        type: 'rollup',
        result_type: 'any', // Depends on rollup function and source property
        expression: undefined,
        source_relation: property.rollup?.relation_property_name,
        source_property: property.rollup?.rollup_property_name,
        aggregation: property.rollup?.function,
        queryable: true,
        dependencies: [property.rollup?.relation_property_name].filter(Boolean),
      })
    }
  }

  return computedFields
}

// Helper functions
function isQueryableProperty(propertyType: PropertyType): boolean {
  // Most properties are queryable in WHERE clauses
  return true
}

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

function isFilterableProperty(propertyType: PropertyType): boolean {
  // Almost all properties are filterable
  return true
}

function isUpdatableProperty(propertyType: PropertyType): boolean {
  const readOnlyTypes: PropertyType[] = ['formula', 'rollup', 'unique_id']
  return !readOnlyTypes.includes(propertyType)
}

function getSystemPropertyType(property: string): 'unique_id' | 'timestamp' | 'boolean' | 'url' | 'user' {
  switch (property) {
    case 'id':
      return 'unique_id'
    case 'created_time':
    case 'last_edited_time':
      return 'timestamp'
    case 'archived':
      return 'boolean'
    case 'url':
      return 'url'
    case 'created_by':
    case 'last_edited_by':
      return 'user'
    default:
      return 'unique_id'
  }
}

function getSystemPropertyDescription(property: string): string {
  switch (property) {
    case 'id':
      return 'Unique page identifier (UUID)'
    case 'created_time':
      return 'When the page was created'
    case 'last_edited_time':
      return 'When the page was last modified'
    case 'created_by':
      return 'User who created the page'
    case 'last_edited_by':
      return 'User who last modified the page'
    case 'archived':
      return 'Whether the page is archived (deleted)'
    case 'url':
      return 'Public URL to the page'
    default:
      return ''
  }
}

function isSystemPropertyQueryable(property: string): boolean {
  const queryableProps = ['id', 'created_time', 'last_edited_time', 'archived']
  return queryableProps.includes(property)
}

function isSystemPropertyReadOnly(property: string): boolean {
  const readOnlyProps = ['id', 'created_time', 'last_edited_time', 'created_by', 'last_edited_by', 'url']
  return readOnlyProps.includes(property)
}

function getSystemPropertyExample(property: string): string | undefined {
  switch (property) {
    case 'id':
      return '59833787-2cf9-4fdf-8782-e53db20768a5'
    case 'created_time':
    case 'last_edited_time':
      return '2023-12-01T10:30:00.000Z'
    case 'archived':
      return 'false'
    case 'url':
      return 'https://www.notion.so/page-title-59833787'
    default:
      return undefined
  }
}

function getSystemPropertyFormat(property: string): string | undefined {
  switch (property) {
    case 'created_time':
    case 'last_edited_time':
      return 'ISO8601'
    case 'id':
      return 'UUID'
    default:
      return undefined
  }
}

function extractFormulaDependencies(expression?: string): string[] {
  if (!expression) return []

  // Simple regex to extract property names from prop("PropertyName") calls
  const propRegex = /prop\(["']([^"']+)["']\)/g
  const dependencies: string[] = []
  let match

  while ((match = propRegex.exec(expression)) !== null) {
    dependencies.push(match[1])
  }

  return [...new Set(dependencies)] // Remove duplicates
}

/**
 * Validate DESCRIBE operation
 */
export function validateDescribeOperation(operation: DescribeOperation): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!operation.database_id) {
    errors.push('Database ID is required')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Build DESCRIBE SQL from parameters
 */
export function buildDescribeSQL(options: { databaseId: string; extended?: boolean; columns?: string[] }): string {
  let sql = `DESCRIBE "${options.databaseId}"`

  if (options.extended) {
    sql += ' EXTENDED'
  }

  if (options.columns && options.columns.length > 0) {
    sql += ` WHERE name IN (${options.columns.map((col) => `'${col}'`).join(', ')})`
  }

  return sql
}

/**
 * Get quick schema summary
 */
export async function getQuickSchema(
  databaseId: string,
  client: Client,
): Promise<{
  name: string
  columns: Array<{ name: string; type: PropertyType }>
  total_columns: number
}> {
  try {
    const database = await client.databases.retrieve({ database_id: databaseId })

    const columns = Object.entries(database.properties || {}).map(([name, property]) => ({
      name,
      type: property.type as PropertyType,
    }))

    // Get database name safely
    let databaseName = 'Untitled Database'
    if ('title' in database && database.title && database.title.length > 0) {
      databaseName = database.title[0]?.plain_text || 'Untitled Database'
    }

    return {
      name: databaseName,
      columns,
      total_columns: columns.length,
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new DatabaseNotFoundError(databaseId)
    }
    throw error
  }
}

/**
 * Show databases (list accessible databases)
 */
export async function showDatabases(
  client: Client,
): Promise<Array<{ id: string; name: string; created_time: string }>> {
  // Note: Notion API doesn't provide a direct way to list all databases
  // This would require searching through pages or maintaining a registry
  // For now, return empty array with a note
  return []
}

/**
 * Show columns (simplified DESCRIBE)
 */
export async function showColumns(
  databaseId: string,
  client: Client,
): Promise<Array<{ name: string; type: PropertyType; nullable: boolean }>> {
  const schema = await getQuickSchema(databaseId, client)

  return schema.columns.map((col) => ({
    name: col.name,
    type: col.type,
    nullable: col.type !== 'title',
  }))
}
