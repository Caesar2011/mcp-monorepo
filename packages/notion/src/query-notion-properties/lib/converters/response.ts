/**
 * Response format simplification converter
 * Converts verbose Notion API responses to clean SQL-like JSON
 */

import {
  type DatabaseObjectResponse,
  type PageObjectResponse,
  type QueryDatabaseResponse,
  type PartialDatabaseObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js'

import { convertNotionPropertyToSQLValue } from './property-types.js'
import { SYSTEM_PROPERTIES, RESPONSE_FORMAT_DEFAULTS } from '../utils/constants.js'

import type {
  SimplifiedPage,
  SimplifiedPropertyValue,
  ResponseFormatConfig,
  SelectResult,
  InsertResult,
  UpdateResult,
  DeleteResult,
  UndeleteResult,
  DescribeResult,
  MetaFieldDefinition,
  ColumnDefinition,
  PropertyTypeMapping,
} from '../types/index.js'

/**
 * Convert Notion database query response to simplified format
 */
export function convertQueryDatabaseResponse(
  response: QueryDatabaseResponse,
  config: ResponseFormatConfig = RESPONSE_FORMAT_DEFAULTS,
): SelectResult {
  const simplifiedPages = response.results.map((page) =>
    convertPageToSimplifiedFormat(page as PageObjectResponse, config),
  )

  return {
    success: true,
    operation: 'select',
    database_id: extractDatabaseIdFromResults(response.results),
    count: simplifiedPages.length,
    results: simplifiedPages,
    pagination: {
      has_more: response.has_more,
      next_cursor: response.next_cursor || undefined,
    },
    execution_time_ms: 0, // Will be set by caller
    timestamp: new Date().toISOString(),
  }
}

/**
 * Convert single Notion page to simplified format
 */
export function convertPageToSimplifiedFormat(
  page: PageObjectResponse,
  config: ResponseFormatConfig = RESPONSE_FORMAT_DEFAULTS,
): SimplifiedPage {
  const simplifiedPage: SimplifiedPage = {
    // System properties (always included)
    id: page.id,
    created_time: page.created_time,
    last_edited_time: page.last_edited_time,
    archived: page.archived,
    url: page.url,
  }

  // Add custom properties
  if (page.properties) {
    for (const [propertyName, property] of Object.entries(page.properties)) {
      // Skip empty properties if configured
      if (!config.includeEmptyProperties && isEmptyProperty(property)) {
        continue
      }

      // Convert property to simplified value
      const simplifiedValue = convertNotionPropertyToSQLValue(property as any, propertyName)

      if (simplifiedValue !== null || config.includeEmptyProperties) {
        simplifiedPage[propertyName] = simplifiedValue
      }
    }
  }

  // Apply additional formatting options
  return applyFormatting(simplifiedPage, config)
}

/**
 * Convert array of pages to simplified format
 */
export function convertPagesToSimplifiedFormat(
  pages: PageObjectResponse[],
  config: ResponseFormatConfig = RESPONSE_FORMAT_DEFAULTS,
): SimplifiedPage[] {
  return pages.map((page) => convertPageToSimplifiedFormat(page, config))
}

/**
 * Create INSERT operation result
 */
export function createInsertResult(
  insertedPages: PageObjectResponse[],
  databaseId: string,
  config: ResponseFormatConfig = RESPONSE_FORMAT_DEFAULTS,
): InsertResult {
  const simplifiedPages = convertPagesToSimplifiedFormat(insertedPages, config)

  return {
    success: true,
    operation: 'insert',
    database_id: databaseId,
    inserted_count: simplifiedPages.length,
    results: simplifiedPages,
    execution_time_ms: 0, // Will be set by caller
    timestamp: new Date().toISOString(),
  }
}

/**
 * Create UPDATE operation result
 */
export function createUpdateResult(
  updatedPages: PageObjectResponse[],
  changes: Record<string, SimplifiedPropertyValue>,
  databaseId?: string,
  pageId?: string,
  config: ResponseFormatConfig = RESPONSE_FORMAT_DEFAULTS,
): UpdateResult {
  const simplifiedPages = convertPagesToSimplifiedFormat(updatedPages, config)

  return {
    success: true,
    operation: 'update',
    database_id: databaseId,
    page_id: pageId,
    updated_count: simplifiedPages.length,
    results: simplifiedPages,
    changes,
    execution_time_ms: 0, // Will be set by caller
    timestamp: new Date().toISOString(),
  }
}

/**
 * Create DELETE operation result
 */
export function createDeleteResult(
  archivedPages: PageObjectResponse[],
  databaseId: string,
  config: ResponseFormatConfig = RESPONSE_FORMAT_DEFAULTS,
): DeleteResult {
  const simplifiedPages = convertPagesToSimplifiedFormat(archivedPages, config)

  // Add archived_time to each result
  const resultsWithArchiveTime = simplifiedPages.map((page) => ({
    ...page,
    archived_time: new Date().toISOString(),
  }))

  return {
    success: true,
    operation: 'delete',
    database_id: databaseId,
    archived_count: resultsWithArchiveTime.length,
    results: resultsWithArchiveTime,
    execution_time_ms: 0, // Will be set by caller
    timestamp: new Date().toISOString(),
  }
}

/**
 * Create UNDELETE operation result
 */
export function createUndeleteResult(
  restoredPages: PageObjectResponse[],
  databaseId: string,
  config: ResponseFormatConfig = RESPONSE_FORMAT_DEFAULTS,
): UndeleteResult {
  const simplifiedPages = convertPagesToSimplifiedFormat(restoredPages, config)

  // Add restored_time to each result
  const resultsWithRestoreTime = simplifiedPages.map((page) => ({
    ...page,
    restored_time: new Date().toISOString(),
  }))

  return {
    success: true,
    operation: 'undelete',
    database_id: databaseId,
    restored_count: resultsWithRestoreTime.length,
    results: resultsWithRestoreTime,
    execution_time_ms: 0, // Will be set by caller
    timestamp: new Date().toISOString(),
  }
}

/**
 * Create DESCRIBE operation result
 */
export function createDescribeResult(
  database: DatabaseObjectResponse | PartialDatabaseObjectResponse,
  extended: boolean = false,
): DescribeResult {
  const properties = database.properties || {}

  // Convert properties to column definitions
  const columns = Object.entries(properties).map(
    ([name, property]): ColumnDefinition => ({
      name,
      type: property.type as keyof PropertyTypeMapping,
      nullable: true, // Most Notion properties are nullable
      primary_key: property.type === 'title', // Title is primary key
      description: undefined,
      queryable: isQueryableProperty(property.type),
      sortable: isSortableProperty(property.type),
      filterable: isFilterableProperty(property.type),
      updatable: isUpdatableProperty(property.type),
      system_generated: false,
      // Add type-specific metadata
      ...getPropertyTypeMetadata(property),
    }),
  )

  // Add system/meta fields
  const metaFields: MetaFieldDefinition[] = SYSTEM_PROPERTIES.map((prop) => ({
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

  const fullDatabase = database as DatabaseObjectResponse

  return {
    success: true,
    operation: 'describe',
    database_id: database.id,
    database_info: {
      name: extractDatabaseTitle(fullDatabase),
      description: extractDatabaseDescription(fullDatabase),
      created_time: fullDatabase.created_time || new Date().toISOString(),
      last_edited_time: fullDatabase.last_edited_time || new Date().toISOString(),
      icon: extractDatabaseIcon(fullDatabase),
      cover_url: extractDatabaseCover(fullDatabase),
      url: fullDatabase.url || '',
      is_inline: fullDatabase.is_inline || false,
      archived: fullDatabase.archived || false,
    },
    columns,
    meta_fields: metaFields,
    relationships: extractRelationships(properties),
    computed_fields: extractComputedFields(properties),
    statistics: {
      total_pages: 0, // Will be populated by caller if needed
      archived_pages: 0, // Will be populated by caller if needed
      last_modified: fullDatabase.last_edited_time || new Date().toISOString(),
    },
    execution_time_ms: 0, // Will be set by caller
    timestamp: new Date().toISOString(),
  }
}

// Utility functions
function isEmptyProperty(property: any): boolean {
  if (!property || !property.type) return true

  // Handle property based on type with proper type checking
  switch (property.type) {
    case 'title':
    case 'rich_text':
      return !property[property.type] || property[property.type].length === 0
    case 'multi_select':
    case 'people':
    case 'relation':
    case 'files':
      return !property[property.type] || property[property.type].length === 0
    case 'number':
    case 'url':
    case 'email':
    case 'phone_number':
    case 'select':
    case 'date':
    case 'status':
      return property[property.type] === null || property[property.type] === undefined
    case 'checkbox':
      return false // Checkbox always has a value
    default:
      return false
  }
}

function applyFormatting(page: SimplifiedPage, config: ResponseFormatConfig): SimplifiedPage {
  const formatted = { ...page }

  // Date formatting
  if (config.dateFormat === 'locale') {
    // Convert ISO dates to locale format if requested
    Object.keys(formatted).forEach((key) => {
      const value = formatted[key]
      if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        try {
          formatted[key] = new Date(value).toLocaleString()
        } catch {
          // Keep original if conversion fails
        }
      }
    })
  }

  // Truncate arrays if they exceed maxArrayItems
  if (config.maxArrayItems && config.maxArrayItems > 0) {
    Object.keys(formatted).forEach((key) => {
      const value = formatted[key]
      if (Array.isArray(value) && value.length > config.maxArrayItems!) {
        formatted[key] = value.slice(0, config.maxArrayItems!)
      }
    })
  }

  // Remove URLs if not wanted
  if (!config.includeUrls && 'url' in formatted) {
    delete (formatted as any).url
  }

  return formatted
}

function extractDatabaseIdFromResults(results: any[]): string {
  if (results.length > 0 && results[0].parent?.database_id) {
    return results[0].parent.database_id
  }
  return 'unknown'
}

function extractDatabaseTitle(database: DatabaseObjectResponse): string {
  if (database.title && database.title.length > 0) {
    return database.title.map((t) => t.plain_text || '').join('')
  }
  return 'Untitled Database'
}

function extractDatabaseDescription(database: DatabaseObjectResponse): string | undefined {
  if (database.description && database.description.length > 0) {
    return database.description.map((d) => d.plain_text || '').join('')
  }
  return undefined
}

function extractDatabaseIcon(database: DatabaseObjectResponse): string | undefined {
  if (database.icon) {
    if (database.icon.type === 'emoji') {
      return database.icon.emoji
    }
    if (database.icon.type === 'external') {
      return database.icon.external?.url
    }
    if (database.icon.type === 'file') {
      return database.icon.file?.url
    }
  }
  return undefined
}

function extractDatabaseCover(database: DatabaseObjectResponse): string | undefined {
  if (database.cover) {
    if (database.cover.type === 'external') {
      return database.cover.external?.url
    }
    if (database.cover.type === 'file') {
      return database.cover.file?.url
    }
  }
  return undefined
}

function isQueryableProperty(propertyType: string): boolean {
  // Almost all properties are queryable
  return true
}

function isSortableProperty(propertyType: string): boolean {
  const sortableTypes = [
    'title',
    'rich_text',
    'number',
    'select',
    'date',
    'checkbox',
    'created_time',
    'last_edited_time',
    'status',
  ]
  return sortableTypes.includes(propertyType)
}

function isFilterableProperty(propertyType: string): boolean {
  // Almost all properties are filterable
  return true
}

function isUpdatableProperty(propertyType: string): boolean {
  const readOnlyTypes = ['formula', 'rollup', 'unique_id', 'created_time', 'last_edited_time']
  return !readOnlyTypes.includes(propertyType)
}

function getPropertyTypeMetadata(property: any): Record<string, any> {
  const metadata: Record<string, any> = {}

  switch (property.type) {
    case 'select':
    case 'multi_select':
      if (property[property.type]?.options) {
        metadata.options = property[property.type].options.map((opt: any) => ({
          name: opt.name,
          color: opt.color,
        }))
      }
      break

    case 'number':
      if (property.number?.format) {
        metadata.format = property.number.format
      }
      break

    case 'formula':
      if (property.formula?.expression) {
        metadata.expression = property.formula.expression
      }
      break

    case 'rollup':
      if (property.rollup) {
        metadata.source_relation = property.rollup.relation_property_name
        metadata.source_property = property.rollup.rollup_property_name
        metadata.aggregation = property.rollup.function
      }
      break
  }

  return metadata
}

// System property helpers
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
  const queryableSystemProps = ['id', 'created_time', 'last_edited_time', 'archived']
  return queryableSystemProps.includes(property)
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

function extractRelationships(properties: Record<string, any>): any[] {
  const relationships = []

  for (const [name, property] of Object.entries(properties)) {
    if (property.type === 'relation' && property.relation) {
      relationships.push({
        name,
        type: 'relation',
        target_database: property.relation.database_id,
        cardinality: property.relation.type === 'single_property' ? 'one_to_many' : 'many_to_many',
        bidirectional: property.relation.type === 'dual_property',
      })
    }
  }

  return relationships
}

function extractComputedFields(properties: Record<string, any>): any[] {
  const computedFields = []

  for (const [name, property] of Object.entries(properties)) {
    if (property.type === 'formula') {
      computedFields.push({
        name,
        type: 'formula',
        result_type: 'any', // Would need to analyze formula to determine
        expression: property.formula?.expression,
        queryable: true,
        dependencies: [], // Would need to parse formula to extract
      })
    } else if (property.type === 'rollup') {
      computedFields.push({
        name,
        type: 'rollup',
        result_type: 'any', // Depends on rollup function
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

/**
 * Simplify response based on operation type
 */
export function simplifyOperationResponse<T>(result: T, config: ResponseFormatConfig = RESPONSE_FORMAT_DEFAULTS): T {
  // Apply global formatting options to any response
  if (typeof result === 'object' && result !== null) {
    return JSON.parse(
      JSON.stringify(result, (key, value) => {
        // Format dates if needed
        if (
          config.dateFormat === 'locale' &&
          typeof value === 'string' &&
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
        ) {
          try {
            return new Date(value).toLocaleString()
          } catch {
            return value
          }
        }

        // Truncate arrays if needed
        if (config.maxArrayItems && Array.isArray(value) && value.length > config.maxArrayItems) {
          return value.slice(0, config.maxArrayItems)
        }

        return value
      }),
    )
  }

  return result
}
