/**
 * SQL preprocessor for handling Notion-specific extensions
 * Converts UNDELETE, ARCHIVED properties, and custom functions to standard SQL
 */

import { SQL_PREPROCESSING_PATTERNS } from '../utils/constants.js'
import { SQLParsingError } from '../utils/error-handling.js'

import type { PreprocessResult, Transformation, NotionFunction, NotionFunctionName } from '../types/ast.js'

/**
 * Main SQL preprocessing function
 * Handles all custom SQL extensions before passing to node-sql-parser
 */
export function preprocessSQL(sql: string): PreprocessResult {
  const transformations: Transformation[] = []
  const customFunctions: NotionFunction[] = []
  let processedSQL = sql.trim()

  // Step 1: Handle UNDELETE operations
  if (isUndeleteStatement(processedSQL)) {
    const result = convertUndeleteToUpdate(processedSQL)
    processedSQL = result.sql
    transformations.push(result.transformation)
  }

  // Step 2: Handle DELETE operations (convert to archive)
  if (isDeleteStatement(processedSQL)) {
    const result = convertDeleteToArchive(processedSQL)
    processedSQL = result.sql
    transformations.push(result.transformation)
  }

  // Step 3: Handle DROP/UNDROP operations (for individual pages)
  if (isDropStatement(processedSQL)) {
    const result = convertDropToUpdate(processedSQL)
    processedSQL = result.sql
    transformations.push(result.transformation)
  }

  if (isUndropStatement(processedSQL)) {
    const result = convertUndropToUpdate(processedSQL)
    processedSQL = result.sql
    transformations.push(result.transformation)
  }

  // Step 4: Handle DESCRIBE operations
  if (isDescribeStatement(processedSQL)) {
    const result = convertDescribeToSelect(processedSQL)
    processedSQL = result.sql
    transformations.push(result.transformation)
  }

  // Step 5: Replace custom functions with placeholders
  const functionResult = replaceCustomFunctions(processedSQL)
  processedSQL = functionResult.sql
  customFunctions.push(...functionResult.functions)
  transformations.push(...functionResult.transformations)

  return {
    sql: processedSQL,
    transformations,
    customFunctions,
  }
}

/**
 * Check if SQL statement is UNDELETE
 */
function isUndeleteStatement(sql: string): boolean {
  return SQL_PREPROCESSING_PATTERNS.UNDELETE.test(sql)
}

/**
 * Convert UNDELETE to UPDATE with archived filter
 */
function convertUndeleteToUpdate(sql: string): {
  sql: string
  transformation: Transformation
} {
  const match = sql.match(SQL_PREPROCESSING_PATTERNS.UNDELETE)

  if (!match) {
    throw new SQLParsingError('Invalid UNDELETE syntax', sql)
  }

  const table = match[1]
  const whereClause = match[2] || 'ARCHIVED = true'

  // Ensure we only restore archived items
  const safeWhere = whereClause.toUpperCase().includes('ARCHIVED')
    ? whereClause
    : `(${whereClause}) AND ARCHIVED = true`

  const newSQL = `UPDATE ${table} SET ARCHIVED = false WHERE ${safeWhere}`

  return {
    sql: newSQL,
    transformation: {
      type: 'undelete_to_update',
      original: sql,
      transformed: newSQL,
      position: { start: 0, end: sql.length },
    },
  }
}

/**
 * Check if SQL statement is DELETE
 */
function isDeleteStatement(sql: string): boolean {
  return SQL_PREPROCESSING_PATTERNS.DELETE.test(sql) && !sql.toUpperCase().includes('UNDELETE')
}

/**
 * Convert DELETE to UPDATE with archive
 */
function convertDeleteToArchive(sql: string): {
  sql: string
  transformation: Transformation
} {
  const match = sql.match(SQL_PREPROCESSING_PATTERNS.DELETE)

  if (!match) {
    throw new SQLParsingError('Invalid DELETE syntax', sql)
  }

  const table = match[1]
  const whereClause = match[2]

  if (!whereClause) {
    throw new SQLParsingError(
      'DELETE without WHERE clause not allowed for safety',
      sql,
      'Add WHERE clause or use "WHERE 1=1" to delete all records',
    )
  }

  const newSQL = `UPDATE ${table} SET ARCHIVED = true WHERE ${whereClause}`

  return {
    sql: newSQL,
    transformation: {
      type: 'delete_to_archive',
      original: sql,
      transformed: newSQL,
      position: { start: 0, end: sql.length },
    },
  }
}

/**
 * Check if SQL statement is DROP
 */
function isDropStatement(sql: string): boolean {
  return SQL_PREPROCESSING_PATTERNS.DROP.test(sql) && !sql.toUpperCase().includes('UNDROP')
}

/**
 * Convert DROP to UPDATE (for individual pages)
 */
function convertDropToUpdate(sql: string): {
  sql: string
  transformation: Transformation
} {
  const match = sql.match(SQL_PREPROCESSING_PATTERNS.DROP)

  if (!match) {
    throw new SQLParsingError('Invalid DROP syntax', sql)
  }

  const pageReference = match[1].trim()

  // Handle different DROP formats
  let newSQL: string
  if (pageReference.startsWith('"') && pageReference.endsWith('"')) {
    // DROP "page-id" -> UPDATE page directly
    const pageId = pageReference.slice(1, -1)
    newSQL = `UPDATE PAGE "${pageId}" SET ARCHIVED = true`
  } else {
    // DROP table-like reference
    newSQL = `UPDATE ${pageReference} SET ARCHIVED = true`
  }

  return {
    sql: newSQL,
    transformation: {
      type: 'delete_to_archive',
      original: sql,
      transformed: newSQL,
      position: { start: 0, end: sql.length },
    },
  }
}

/**
 * Check if SQL statement is UNDROP
 */
function isUndropStatement(sql: string): boolean {
  return SQL_PREPROCESSING_PATTERNS.UNDROP.test(sql)
}

/**
 * Convert UNDROP to UPDATE (restore individual pages)
 */
function convertUndropToUpdate(sql: string): {
  sql: string
  transformation: Transformation
} {
  const match = sql.match(SQL_PREPROCESSING_PATTERNS.UNDROP)

  if (!match) {
    throw new SQLParsingError('Invalid UNDROP syntax', sql)
  }

  const pageReference = match[1].trim()

  let newSQL: string
  if (pageReference.startsWith('"') && pageReference.endsWith('"')) {
    // UNDROP "page-id" -> UPDATE page directly
    const pageId = pageReference.slice(1, -1)
    newSQL = `UPDATE PAGE "${pageId}" SET ARCHIVED = false`
  } else {
    // UNDROP table-like reference
    newSQL = `UPDATE ${pageReference} SET ARCHIVED = false`
  }

  return {
    sql: newSQL,
    transformation: {
      type: 'undelete_to_update',
      original: sql,
      transformed: newSQL,
      position: { start: 0, end: sql.length },
    },
  }
}

/**
 * Check if SQL statement is DESCRIBE
 */
function isDescribeStatement(sql: string): boolean {
  return SQL_PREPROCESSING_PATTERNS.DESCRIBE.test(sql)
}

/**
 * Convert DESCRIBE to special SELECT (for schema introspection)
 */
function convertDescribeToSelect(sql: string): {
  sql: string
  transformation: Transformation
} {
  const match = sql.match(SQL_PREPROCESSING_PATTERNS.DESCRIBE)

  if (!match) {
    throw new SQLParsingError('Invalid DESCRIBE syntax', sql)
  }

  const table = match[1]
  const extended = match[2] === 'EXTENDED'
  const whereClause = match[3]

  // Convert to a special SELECT that will be handled by the describe operation
  let newSQL = `SELECT '__DESCRIBE__' FROM ${table}`

  if (extended) {
    newSQL = `SELECT '__DESCRIBE_EXTENDED__' FROM ${table}`
  }

  if (whereClause) {
    newSQL += ` WHERE ${whereClause}`
  }

  return {
    sql: newSQL,
    transformation: {
      type: 'function_replacement',
      original: sql,
      transformed: newSQL,
      position: { start: 0, end: sql.length },
    },
  }
}

/**
 * Replace custom functions with SQL-compatible placeholders
 */
function replaceCustomFunctions(sql: string): {
  sql: string
  functions: NotionFunction[]
  transformations: Transformation[]
} {
  let processedSQL = sql
  const functions: NotionFunction[] = []
  const transformations: Transformation[] = []

  // Replace function calls with placeholders
  for (const [functionCall, placeholder] of Object.entries(SQL_PREPROCESSING_PATTERNS.FUNCTION_REPLACEMENTS)) {
    if (processedSQL.includes(functionCall)) {
      const functionName = functionCall.replace('()', '') as NotionFunctionName

      functions.push({
        type: 'function',
        name: functionName,
        args: [],
      })

      const originalSQL = processedSQL
      processedSQL = processedSQL.replace(new RegExp(escapeRegExp(functionCall), 'g'), placeholder)

      if (originalSQL !== processedSQL) {
        transformations.push({
          type: 'function_replacement',
          original: functionCall,
          transformed: placeholder,
          position: {
            start: originalSQL.indexOf(functionCall),
            end: originalSQL.indexOf(functionCall) + functionCall.length,
          },
        })
      }
    }
  }

  // Handle rollup functions (more complex parsing needed)
  processedSQL = handleRollupFunctions(processedSQL, functions, transformations)

  return {
    sql: processedSQL,
    functions,
    transformations,
  }
}

/**
 * Handle ROLLUP functions which have arguments
 */
function handleRollupFunctions(sql: string, functions: NotionFunction[], transformations: Transformation[]): string {
  let processedSQL = sql

  // Match ROLLUP_ANY(condition), ROLLUP_ALL(condition), etc.
  const rollupPattern = /\b(ROLLUP_(?:ANY|ALL|NONE))\s*\(([^)]+)\)/gi

  let match
  while ((match = rollupPattern.exec(processedSQL))) {
    const fullMatch = match[0]
    const functionName = match[1] as NotionFunctionName
    const condition = match[2]

    functions.push({
      type: 'function',
      name: functionName,
      args: [condition],
    })

    // Replace with placeholder that preserves the condition
    const placeholder = `'__${functionName}__(${condition})'`
    processedSQL = processedSQL.replace(fullMatch, placeholder)

    transformations.push({
      type: 'function_replacement',
      original: fullMatch,
      transformed: placeholder,
      position: { start: match.index, end: match.index + fullMatch.length },
    })
  }

  return processedSQL
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Validate preprocessed SQL for common issues
 */
export function validatePreprocessedSQL(sql: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check for unmatched placeholders
  const placeholderPattern = /__[A-Z_]+__/g
  const placeholders = sql.match(placeholderPattern) || []

  for (const placeholder of placeholders) {
    if (!Object.values(SQL_PREPROCESSING_PATTERNS.FUNCTION_REPLACEMENTS).includes(`'${placeholder}'` as never)) {
      errors.push(`Unrecognized placeholder: ${placeholder}`)
    }
  }

  // Check for balanced quotes after preprocessing
  const singleQuotes = (sql.match(/'/g) || []).length
  const doubleQuotes = (sql.match(/"/g) || []).length

  if (singleQuotes % 2 !== 0) {
    errors.push('Unmatched single quote after preprocessing')
  }

  if (doubleQuotes % 2 !== 0) {
    errors.push('Unmatched double quote after preprocessing')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Restore original function calls from placeholders (for error messages)
 */
export function restoreFunctionCalls(processedSQL: string): string {
  let restoredSQL = processedSQL

  for (const [functionCall, placeholder] of Object.entries(SQL_PREPROCESSING_PATTERNS.FUNCTION_REPLACEMENTS)) {
    restoredSQL = restoredSQL.replace(new RegExp(escapeRegExp(placeholder), 'g'), functionCall)
  }

  return restoredSQL
}

/**
 * Get preprocessing statistics for debugging
 */
export function getPreprocessingStats(result: PreprocessResult): {
  totalTransformations: number
  customFunctions: number
  transformationTypes: Record<string, number>
} {
  const transformationTypes: Record<string, number> = {}

  for (const transformation of result.transformations) {
    transformationTypes[transformation.type] = (transformationTypes[transformation.type] || 0) + 1
  }

  return {
    totalTransformations: result.transformations.length,
    customFunctions: result.customFunctions.length,
    transformationTypes,
  }
}
