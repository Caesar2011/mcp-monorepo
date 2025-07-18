/**
 * Rollup function implementations for Notion SQL queries
 * Handles ROLLUP_ANY, ROLLUP_ALL, and ROLLUP_NONE operations
 */

import { convertWhereClauseToNotionFilter } from '../converters/filters.js'
import { SQLParsingError, PropertyValidationError } from '../utils/error-handling.js'

import type { WhereClause, RollupFilter, PropertyType } from '../types/index.js'

/**
 * Rollup function names supported by Notion
 */
export type RollupFunctionName = 'ROLLUP_ANY' | 'ROLLUP_ALL' | 'ROLLUP_NONE'

/**
 * Rollup aggregation functions for numeric rollups
 */
export type RollupAggregation =
  | 'count'
  | 'count_values'
  | 'count_unique_values'
  | 'count_empty'
  | 'count_not_empty'
  | 'percent_empty'
  | 'percent_not_empty'
  | 'sum'
  | 'average'
  | 'median'
  | 'min'
  | 'max'
  | 'range'
  | 'earliest_date'
  | 'latest_date'
  | 'date_range'
  | 'checked'
  | 'unchecked'
  | 'percent_checked'
  | 'percent_unchecked'

/**
 * Parsed rollup function call
 */
export interface RollupFunctionCall {
  function: RollupFunctionName
  condition: WhereClause
  originalExpression: string
}

/**
 * Convert rollup function to Notion rollup filter
 */
export function convertRollupFunctionToFilter(
  functionCall: RollupFunctionCall,
  propertyTypes: Record<string, PropertyType>,
): RollupFilter {
  const { function: rollupFunction, condition } = functionCall

  // Convert the condition to a Notion filter
  const conditionFilter = convertWhereClauseToNotionFilter(condition, propertyTypes)

  switch (rollupFunction) {
    case 'ROLLUP_ANY':
      return {
        any: conditionFilter,
      }

    case 'ROLLUP_ALL':
      return {
        every: conditionFilter,
      }

    case 'ROLLUP_NONE':
      return {
        none: conditionFilter,
      }

    default:
      throw new PropertyValidationError(`Unknown rollup function: ${rollupFunction}`, 'rollup_function', rollupFunction)
  }
}

/**
 * Parse rollup function call from SQL expression
 * Example: "ROLLUP_ANY(Status = 'Active' AND Priority > 3)"
 */
export function parseRollupFunctionCall(expression: string): RollupFunctionCall {
  // Match ROLLUP_XXX(condition)
  const regex = /\b(ROLLUP_(?:ANY|ALL|NONE))\s*\(([^)]+)\)/i
  const match = expression.match(regex)

  if (!match) {
    throw new SQLParsingError(
      `Invalid rollup function syntax: ${expression}`,
      expression,
      'Use format: ROLLUP_ANY(condition), ROLLUP_ALL(condition), or ROLLUP_NONE(condition)',
    )
  }

  const functionName = match[1].toUpperCase() as RollupFunctionName
  const conditionString = match[2].trim()

  // Parse the condition string into a WHERE clause AST
  // This is a simplified implementation - in practice, you'd use a proper SQL parser
  const condition = parseSimpleCondition(conditionString)

  return {
    function: functionName,
    condition,
    originalExpression: expression,
  }
}

/**
 * Parse simple condition string into WHERE clause AST
 * Handles basic comparisons and logical operators
 */
function parseSimpleCondition(conditionString: string): WhereClause {
  // Handle AND/OR logic
  if (conditionString.includes(' AND ')) {
    const parts = conditionString.split(' AND ')
    return {
      type: 'binary_expr',
      operator: 'AND',
      left: parseSimpleCondition(parts[0].trim()),
      right: parseSimpleCondition(parts.slice(1).join(' AND ').trim()),
    }
  }

  if (conditionString.includes(' OR ')) {
    const parts = conditionString.split(' OR ')
    return {
      type: 'binary_expr',
      operator: 'OR',
      left: parseSimpleCondition(parts[0].trim()),
      right: parseSimpleCondition(parts.slice(1).join(' OR ').trim()),
    }
  }

  // Handle basic comparisons
  const comparisonRegex = /^\s*([\w\s"']+)\s*(=|!=|<>|>|>=|<|<=|LIKE|CONTAINS|IN)\s*(.+)\s*$/i
  const match = conditionString.match(comparisonRegex)

  if (!match) {
    throw new SQLParsingError(
      `Invalid condition syntax: ${conditionString}`,
      conditionString,
      'Use format: property operator value',
    )
  }

  const property = match[1].trim().replace(/^["']|["']$/g, '')
  const operator = match[2].toUpperCase()
  const value = parseValue(match[3].trim())

  return {
    type: 'binary_expr',
    operator: operator as any,
    left: {
      type: 'column_ref',
      column: property,
    },
    right: {
      type:
        typeof value === 'string'
          ? 'string'
          : typeof value === 'number'
            ? 'number'
            : typeof value === 'boolean'
              ? 'boolean'
              : 'string',
      value,
    },
  }
}

/**
 * Parse value from string, handling quotes, numbers, and booleans
 */
function parseValue(valueString: string): unknown {
  const trimmed = valueString.trim()

  // Handle quoted strings
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1)
  }

  // Handle numbers
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed)
  }

  // Handle booleans
  if (trimmed.toLowerCase() === 'true') return true
  if (trimmed.toLowerCase() === 'false') return false

  // Handle arrays (simplified)
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const arrayContent = trimmed.slice(1, -1)
    return arrayContent.split(',').map((item) => parseValue(item.trim()))
  }

  // Default to string
  return trimmed
}

/**
 * Check if expression contains rollup function
 */
export function hasRollupFunction(expression: string): boolean {
  return /\bROLLUP_(?:ANY|ALL|NONE)\s*\(/i.test(expression)
}

/**
 * Extract all rollup function calls from expression
 */
export function extractRollupFunctions(expression: string): RollupFunctionCall[] {
  const functions: RollupFunctionCall[] = []
  const regex = /\b(ROLLUP_(?:ANY|ALL|NONE))\s*\(([^)]+)\)/gi

  let match
  while ((match = regex.exec(expression)) !== null) {
    try {
      const functionCall = parseRollupFunctionCall(match[0])
      functions.push(functionCall)
    } catch (error) {
      // Skip invalid function calls, they'll be caught during validation
      console.warn(`Invalid rollup function: ${match[0]}`, error)
    }
  }

  return functions
}

/**
 * Validate rollup function call
 */
export function validateRollupFunction(functionCall: RollupFunctionCall): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate function name
  const validFunctions: RollupFunctionName[] = ['ROLLUP_ANY', 'ROLLUP_ALL', 'ROLLUP_NONE']
  if (!validFunctions.includes(functionCall.function)) {
    errors.push(`Invalid rollup function: ${functionCall.function}`)
  }

  // Validate condition structure
  if (!functionCall.condition) {
    errors.push('Rollup function requires a condition')
  }

  // Check condition complexity (basic validation)
  if (functionCall.originalExpression.length > 500) {
    errors.push('Rollup condition is too complex (max 500 characters)')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Convert rollup function to SQL-compatible placeholder
 * Used during preprocessing to make SQL parseable
 */
export function convertRollupToPlaceholder(expression: string): string {
  return expression.replace(/\b(ROLLUP_(?:ANY|ALL|NONE))\s*\(([^)]+)\)/gi, "'__$1__($2)'")
}

/**
 * Restore rollup function from placeholder
 * Used to convert back from placeholder for processing
 */
export function restoreRollupFromPlaceholder(placeholder: string): RollupFunctionCall | undefined {
  const match = placeholder.match(/^__ROLLUP_(ANY|ALL|NONE)__\((.+)\)$/)

  if (!match) {
    return undefined
  }

  const functionName = `ROLLUP_${match[1]}` as RollupFunctionName
  const conditionString = match[2]

  try {
    const condition = parseSimpleCondition(conditionString)
    return {
      function: functionName,
      condition,
      originalExpression: `${functionName}(${conditionString})`,
    }
  } catch {
    return undefined
  }
}

/**
 * Build rollup property configuration for Notion API
 */
export function buildRollupPropertyConfig(
  relationPropertyName: string,
  rollupPropertyName: string,
  aggregationFunction: RollupAggregation,
): {
  type: 'rollup'
  rollup: {
    relation_property_name: string
    relation_property_id: string
    rollup_property_name: string
    rollup_property_id: string
    function: RollupAggregation
  }
} {
  return {
    type: 'rollup',
    rollup: {
      relation_property_name: relationPropertyName,
      relation_property_id: relationPropertyName, // Would be resolved to actual ID
      rollup_property_name: rollupPropertyName,
      rollup_property_id: rollupPropertyName, // Would be resolved to actual ID
      function: aggregationFunction,
    },
  }
}

/**
 * Get available rollup aggregation functions by property type
 */
export function getAvailableRollupFunctions(propertyType: PropertyType): RollupAggregation[] {
  switch (propertyType) {
    case 'number':
      return [
        'count',
        'count_values',
        'count_unique_values',
        'count_empty',
        'count_not_empty',
        'percent_empty',
        'percent_not_empty',
        'sum',
        'average',
        'median',
        'min',
        'max',
        'range',
      ]

    case 'date':
      return [
        'count',
        'count_values',
        'count_unique_values',
        'count_empty',
        'count_not_empty',
        'percent_empty',
        'percent_not_empty',
        'earliest_date',
        'latest_date',
        'date_range',
      ]

    case 'checkbox':
      return [
        'count',
        'count_values',
        'count_empty',
        'count_not_empty',
        'percent_empty',
        'percent_not_empty',
        'checked',
        'unchecked',
        'percent_checked',
        'percent_unchecked',
      ]

    case 'select':
    case 'multi_select':
    case 'people':
    case 'relation':
    case 'files':
    case 'rich_text':
    case 'title':
    case 'url':
    case 'email':
    case 'phone_number':
      return [
        'count',
        'count_values',
        'count_unique_values',
        'count_empty',
        'count_not_empty',
        'percent_empty',
        'percent_not_empty',
      ]

    default:
      return ['count', 'count_values', 'count_empty', 'count_not_empty']
  }
}

/**
 * Create optimized rollup query for complex conditions
 */
export function optimizeRollupQuery(
  functionCall: RollupFunctionCall,
  relationPropertyType: PropertyType,
): {
  optimized: boolean
  suggestion?: string
  alternativeQuery?: string
} {
  const { condition, function: rollupFunction } = functionCall

  // Check for simple conditions that can be optimized
  if (condition.type === 'binary_expr' && condition.operator === '=' && condition.left?.type === 'column_ref') {
    return {
      optimized: true,
      suggestion: `Simple equality condition can be processed efficiently`,
    }
  }

  // Check for complex conditions that might be slow
  if (condition.type === 'binary_expr' && ['LIKE', 'CONTAINS'].includes(condition.operator as string)) {
    return {
      optimized: false,
      suggestion: `Text search in rollup may be slow. Consider using tags or select properties instead.`,
      alternativeQuery: `Consider adding a tag/select property to related items instead of text search`,
    }
  }

  return {
    optimized: true,
  }
}

/**
 * Get all supported rollup functions
 */
export function getSupportedRollupFunctions(): {
  conditional: RollupFunctionName[]
  aggregation: RollupAggregation[]
} {
  return {
    conditional: ['ROLLUP_ANY', 'ROLLUP_ALL', 'ROLLUP_NONE'],
    aggregation: [
      'count',
      'count_values',
      'count_unique_values',
      'count_empty',
      'count_not_empty',
      'percent_empty',
      'percent_not_empty',
      'sum',
      'average',
      'median',
      'min',
      'max',
      'range',
      'earliest_date',
      'latest_date',
      'date_range',
      'checked',
      'unchecked',
      'percent_checked',
      'percent_unchecked',
    ],
  }
}

/**
 * Create example rollup queries for documentation
 */
export function createRollupExamples(): Record<string, string> {
  return {
    'Find projects with any active tasks': `
 SELECT * FROM "projects-db"
 WHERE "Related Tasks" ROLLUP_ANY(Status = 'Active')
 `,

    'Find projects where all tasks are complete': `
 SELECT * FROM "projects-db"
 WHERE "Related Tasks" ROLLUP_ALL(Status = 'Done')
 `,

    'Find projects with no blocked tasks': `
 SELECT * FROM "projects-db"
 WHERE "Related Tasks" ROLLUP_NONE(Status = 'Blocked')
 `,

    'Find projects with high priority tasks': `
 SELECT * FROM "projects-db"
 WHERE "Related Tasks" ROLLUP_ANY(Priority >= 4 AND Status != 'Done')
 `,

    'Find projects with tasks assigned to specific user': `
 SELECT * FROM "projects-db"
 WHERE "Related Tasks" ROLLUP_ANY(Assignee CONTAINS '@john@company.com')
 `,
  }
}
