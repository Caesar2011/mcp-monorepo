/**
 * INSERT operation handler
 * Handles page creation with property mapping and validation
 */

import { type Client } from '@notionhq/client'
import { type CreatePageParameters } from '@notionhq/client/build/src/api-endpoints.js'

import { convertSQLValueToNotionProperty } from '../converters/property-types.js'
import { createInsertResult } from '../converters/response.js'
import { isReadOnlyProperty } from '../utils/constants.js'
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
  PropertyType,
  DatabasePropertySchema,
  InsertOperation,
  InsertResult,
  QueryContext,
} from '../types/index.js'

/**
 * Execute INSERT operation
 */
export async function executeInsertOperation(
  ast: NotionSQLAST,
  client: Client,
  _context?: QueryContext,
  config?: ResponseFormatConfig,
): Promise<InsertResult> {
  const operation = convertASTToInsertOperation(ast)

  try {
    // Get database schema for property validation
    const schema = await getDatabaseSchema(operation.database_id, client)

    // Validate and convert all rows
    const insertedPages = []
    const startTime = Date.now()

    for (const valueSet of operation.values) {
      // Build property values for this row
      const properties = buildPropertiesForRow(operation.columns, valueSet, schema.properties)

      // Validate properties
      validateInsertProperties(properties, schema.properties)

      // Create page parameters
      const pageParams: CreatePageParameters = {
        parent: {
          database_id: operation.database_id,
        },
        properties,
      }

      // Create the page
      const createdPage = await client.pages.create(pageParams)
      insertedPages.push(createdPage)
    }

    const executionTime = Date.now() - startTime

    // Convert response to simplified format
    const result = createInsertResult(insertedPages as any[], operation.database_id, config)
    result.execution_time_ms = executionTime

    return result
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('database_id') || error.message.includes('not found')) {
        throw new DatabaseNotFoundError(operation.database_id)
      }
      if (error.message.includes('validation')) {
        throw new PropertyValidationError(error.message)
      }
      throw new OperationFailedError('INSERT', error.message, { originalError: error })
    }
    throw new OperationFailedError('INSERT', 'Unknown error occurred')
  }
}

/**
 * Convert AST to INSERT operation
 */
function convertASTToInsertOperation(ast: NotionSQLAST): InsertOperation {
  if (!ast.database && !ast.table) {
    throw new SQLParsingError('INSERT requires INTO clause with database reference')
  }

  if (!ast.columns || ast.columns.length === 0) {
    throw new SQLParsingError('INSERT requires column list')
  }

  if (!ast.values || ast.values.length === 0) {
    throw new SQLParsingError('INSERT requires VALUES clause')
  }

  const databaseId = (ast.database || ast.table || '').replace(/^"|"$/g, '')
  const columns = Array.isArray(ast.columns) ? ast.columns : []

  // Convert VALUES to our format
  const values = ast.values.map((valueRow) => {
    const rowData: Record<string, SimplifiedPropertyValue> = {}

    columns.forEach((column, index) => {
      if (index < valueRow.length) {
        rowData[column] = valueRow[index]
      }
    })

    return rowData
  })

  return {
    type: 'insert',
    database_id: databaseId,
    sql: '', // Will be set by caller
    timestamp: new Date().toISOString(),
    columns,
    values,
    parent_type: 'database_id',
  }
}

/**
 * Get database schema for validation
 */
async function getDatabaseSchema(
  databaseId: string,
  client: Client,
): Promise<{ properties: Record<string, DatabasePropertySchema & { type: PropertyType }> }> {
  try {
    const database = await client.databases.retrieve({ database_id: databaseId })
    const properties: Record<string, DatabasePropertySchema & { type: PropertyType }> = {}

    if (database.properties) {
      for (const [name, property] of Object.entries(database.properties)) {
        properties[name] = {
          ...property,
          type: property.type as PropertyType,
        } as DatabasePropertySchema & { type: PropertyType }
      }
    }

    return { properties }
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      throw new DatabaseNotFoundError(databaseId)
    }
    throw error
  }
}

/**
 * Build properties object for a single row
 */
function buildPropertiesForRow(
  columns: string[],
  values: Record<string, SimplifiedPropertyValue>,
  schemaProperties: Record<string, DatabasePropertySchema & { type: PropertyType }>,
): Record<string, any> {
  const properties: Record<string, any> = {}

  for (const [column, value] of Object.entries(values)) {
    if (value === null || value === undefined) {
      continue // Skip null values
    }

    // Get property type from schema or infer it
    let propertyType: PropertyType

    if (schemaProperties[column]) {
      propertyType = schemaProperties[column].type
    } else {
      // Try to infer the type
      propertyType = inferPropertyType(value, column)
      console.warn(`Property '${column}' not found in schema, inferred type: ${propertyType}`)
    }

    // Convert SQL value to Notion property format
    try {
      const notionProperty = convertSQLValueToNotionProperty(value, propertyType, column)
      properties[column] = notionProperty
    } catch (error) {
      throw new PropertyValidationError(
        `Failed to convert value for property '${column}': ${error instanceof Error ? error.message : String(error)}`,
        column,
        value,
      )
    }
  }

  return properties
}

/**
 * Validate INSERT properties
 */
function validateInsertProperties(
  properties: Record<string, any>,
  schemaProperties: Record<string, DatabasePropertySchema & { type: PropertyType }>,
): void {
  // Check for read-only properties
  for (const propertyName of Object.keys(properties)) {
    if (isReadOnlyProperty(propertyName)) {
      throw new PropertyValidationError(`Cannot insert into read-only property '${propertyName}'`, propertyName)
    }

    // Check for formula/rollup properties
    const schemaProperty = schemaProperties[propertyName]
    if (schemaProperty && (schemaProperty.type === 'formula' || schemaProperty.type === 'rollup')) {
      throw new PropertyValidationError(
        `Cannot insert into computed property '${propertyName}' of type '${schemaProperty.type}'`,
        propertyName,
      )
    }
  }

  // Check for required properties (Title is usually required)
  const titleProperty = Object.entries(schemaProperties).find(([, prop]) => prop.type === 'title')
  if (titleProperty && !properties[titleProperty[0]]) {
    throw new PropertyValidationError(
      `Title property '${titleProperty[0]}' is required for new pages`,
      titleProperty[0],
    )
  }
}

/**
 * Execute batch INSERT operation
 */
export async function executeBatchInsert(
  databaseId: string,
  insertData: Array<Record<string, SimplifiedPropertyValue>>,
  client: Client,
  config?: ResponseFormatConfig,
  maxConcurrency: number = 5,
): Promise<InsertResult> {
  try {
    // Get database schema
    const schema = await getDatabaseSchema(databaseId, client)

    const startTime = Date.now()
    const insertedPages = []

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < insertData.length; i += maxConcurrency) {
      const batch = insertData.slice(i, i + maxConcurrency)

      const batchPromises = batch.map(async (rowData) => {
        // Build properties for this row
        const properties = buildPropertiesForRow(Object.keys(rowData), rowData, schema.properties)

        // Validate properties
        validateInsertProperties(properties, schema.properties)

        // Create page parameters
        const pageParams: CreatePageParameters = {
          parent: {
            database_id: databaseId,
          },
          properties,
        }

        // Create the page
        return client.pages.create(pageParams)
      })

      const batchResults = await Promise.all(batchPromises)
      insertedPages.push(...batchResults)
    }

    const executionTime = Date.now() - startTime

    // Convert response to simplified format
    const result = createInsertResult(insertedPages as any[], databaseId, config)
    result.execution_time_ms = executionTime

    return result
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('database_id') || error.message.includes('not found')) {
        throw new DatabaseNotFoundError(databaseId)
      }
      throw new OperationFailedError('INSERT', error.message, { originalError: error })
    }
    throw new OperationFailedError('INSERT', 'Unknown error occurred')
  }
}

/**
 * Insert single page with type inference
 */
export async function insertSinglePage(
  databaseId: string,
  pageData: Record<string, SimplifiedPropertyValue>,
  client: Client,
  config?: ResponseFormatConfig,
): Promise<InsertResult> {
  return executeBatchInsert(databaseId, [pageData], client, config, 1)
}

/**
 * Validate INSERT operation
 */
export function validateInsertOperation(operation: InsertOperation): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!operation.database_id) {
    errors.push('Database ID is required')
  }

  if (!operation.columns || operation.columns.length === 0) {
    errors.push('Column list is required')
  }

  if (!operation.values || operation.values.length === 0) {
    errors.push('VALUES clause is required')
  }

  // Validate each row has correct number of values
  if (operation.columns && operation.values) {
    for (let i = 0; i < operation.values.length; i++) {
      const valueKeys = Object.keys(operation.values[i])
      if (valueKeys.length !== operation.columns.length) {
        errors.push(`Row ${i + 1}: Expected ${operation.columns.length} values, got ${valueKeys.length}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Build INSERT SQL from parameters
 */
export function buildInsertSQL(options: {
  databaseId: string
  data: Record<string, SimplifiedPropertyValue> | Array<Record<string, SimplifiedPropertyValue>>
}): string {
  const dataArray = Array.isArray(options.data) ? options.data : [options.data]

  if (dataArray.length === 0) {
    throw new Error('No data provided for INSERT')
  }

  // Get columns from first row
  const columns = Object.keys(dataArray[0])
  const quotedColumns = columns.map((col) => (col.includes(' ') ? `"${col}"` : col))

  // Build VALUES clauses
  const valuesClauses = dataArray.map((row) => {
    const values = columns.map((col) => {
      const value = row[col]

      if (value === null || value === undefined) {
        return 'NULL'
      }

      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'` // Escape single quotes
      }

      if (Array.isArray(value)) {
        const arrayStr = value.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ')
        return `[${arrayStr}]`
      }

      return String(value)
    })

    return `(${values.join(', ')})`
  })

  return `INSERT INTO "${options.databaseId}" (${quotedColumns.join(', ')}) VALUES ${valuesClauses.join(', ')}`
}

/**
 * Parse INSERT SQL with advanced type inference
 */
export function parseInsertSQL(sql: string): {
  databaseId: string
  columns: string[]
  values: Array<Record<string, SimplifiedPropertyValue>>
  inferredTypes: Record<string, PropertyType>
} {
  // This is a simplified parser - in practice, you'd use the main SQL parser
  const insertMatch = sql.match(/INSERT\s+INTO\s+["']?([^"'\s]+)["']?\s*\(([^)]+)\)\s+VALUES\s+(.+)/i)

  if (!insertMatch) {
    throw new SQLParsingError('Invalid INSERT syntax')
  }

  const databaseId = insertMatch[1]
  const columnsStr = insertMatch[2]
  const valuesStr = insertMatch[3]

  // Parse columns
  const columns = columnsStr.split(',').map((col) => col.trim().replace(/^["']|["']$/g, ''))

  // Parse values (simplified - would need proper SQL parser for complex cases)
  const values: Array<Record<string, SimplifiedPropertyValue>> = []
  const inferredTypes: Record<string, PropertyType> = {}

  // This is a very basic implementation - real parser would handle this properly
  const valuesMatches = valuesStr.match(/\([^)]+\)/g)

  if (valuesMatches) {
    for (const valueMatch of valuesMatches) {
      const valueStr = valueMatch.slice(1, -1) // Remove parentheses
      const rawValues = valueStr.split(',').map((v) => v.trim())

      const rowData: Record<string, SimplifiedPropertyValue> = {}

      columns.forEach((column, index) => {
        if (index < rawValues.length) {
          let value: SimplifiedPropertyValue = rawValues[index]

          // Basic value parsing
          if (value === 'NULL' || value === 'null') {
            value = null
          } else if (value === 'true' || value === 'false') {
            value = value === 'true'
          } else if (/^\d+(\.\d+)?$/.test(value)) {
            value = Number(value)
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1).replace(/''/g, "'")
          } else if (value.startsWith('[') && value.endsWith(']')) {
            // Array parsing (simplified)
            const arrayContent = value.slice(1, -1)
            value = arrayContent.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''))
          }

          rowData[column] = value

          // Infer type if not already inferred
          if (!inferredTypes[column]) {
            inferredTypes[column] = inferPropertyType(value, column)
          }
        }
      })

      values.push(rowData)
    }
  }

  return {
    databaseId,
    columns,
    values,
    inferredTypes,
  }
}

/**
 * Create INSERT operation from parsed data
 */
export function createInsertOperation(
  databaseId: string,
  columns: string[],
  values: Array<Record<string, SimplifiedPropertyValue>>,
): InsertOperation {
  return {
    type: 'insert',
    database_id: databaseId,
    sql: buildInsertSQL({ databaseId, data: values }),
    timestamp: new Date().toISOString(),
    columns,
    values,
    parent_type: 'database_id',
  }
}
