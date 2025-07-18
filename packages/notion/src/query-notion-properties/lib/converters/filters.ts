/**
 * WHERE clause to Notion filter conversion
 * Handles all SQL comparison operators and logical operations
 */

import { type QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints.js'

import { SQLParsingError, PropertyValidationError } from '../utils/error-handling.js'

import type {
  WhereClause,
  ColumnRef,
  ValueRef,
  ComparisonOperator,
  LogicalOperator,
  PropertyType,
} from '../types/index.js'

// Official Notion API filter type (union from @notionhq/client)
type NotionAPIFilter = NonNullable<QueryDatabaseParameters['filter']>
type PropertyFilter = NotionAPIFilter & { property: string }
type TimestampCreatedTimeFilter = NotionAPIFilter & { timestamp: 'created_time' }
type TimestampLastEditedTimeFilter = NotionAPIFilter & { timestamp: 'last_edited_time' }

/**
 * Convert SQL WHERE clause to official Notion filter
 */
export function convertWhereClauseToNotionFilter(
  whereClause: WhereClause,
  propertyTypes: Record<string, PropertyType>,
): NotionAPIFilter {
  return convertWhereNode(whereClause, propertyTypes)
}

/**
 * Convert individual WHERE clause node to filter
 */
function convertWhereNode(
  node: WhereClause | ColumnRef | ValueRef,
  propertyTypes: Record<string, PropertyType>,
): NotionAPIFilter {
  // Handle different node types from node-sql-parser
  if (!node || typeof node !== 'object' || !('type' in node)) {
    throw new SQLParsingError('Invalid WHERE clause node structure')
  }

  switch (node.type) {
    case 'binary_expr':
      // Only WhereClause has binary_expr type
      return convertBinaryExpression(node as WhereClause, propertyTypes)

    case 'unary_expr':
      // Only WhereClause has unary_expr type
      return convertUnaryExpression(node as WhereClause, propertyTypes)

    case 'function':
      // Only WhereClause has function type
      return convertFunctionExpression(node as WhereClause, propertyTypes)

    case 'column_ref':
    case 'string':
    case 'number':
    case 'boolean':
    case 'sql_null':
    case 'array':
      // These are leaf nodes, shouldn't be converted directly
      throw new SQLParsingError(`Unexpected leaf node type in WHERE clause: ${node.type}`)

    default:
      throw new SQLParsingError(`Unsupported WHERE clause type: ${(node as { type?: string })?.type}`)
  }
}

/**
 * Convert binary expressions (property operator value)
 */
function convertBinaryExpression(node: WhereClause, propertyTypes: Record<string, PropertyType>): NotionAPIFilter {
  if (node.type !== 'binary_expr' || !node.operator || !node.left || !node.right) {
    throw new SQLParsingError('Invalid binary expression in WHERE clause')
  }

  const operator = node.operator as ComparisonOperator | LogicalOperator

  // Handle logical operators (AND, OR)
  if (operator === 'AND' || operator === 'OR') {
    const leftFilter = convertWhereNode(node.left, propertyTypes)
    const rightFilter = convertWhereNode(node.right, propertyTypes)

    return {
      [operator.toLowerCase()]: [leftFilter, rightFilter],
    } as NotionAPIFilter
  }

  // Handle comparison operators
  const propertyName = extractPropertyName(node.left)
  const value = extractValue(node.right)

  if (!propertyName) {
    throw new SQLParsingError('Left side of comparison must be a property name')
  }

  return convertPropertyComparison(propertyName, operator as ComparisonOperator, value, propertyTypes)
}

/**
 * Convert unary expressions (NOT)
 */
function convertUnaryExpression(node: WhereClause, propertyTypes: Record<string, PropertyType>): NotionAPIFilter {
  if (node.type !== 'unary_expr') {
    throw new SQLParsingError('Invalid unary expression')
  }

  if (node.operator === 'NOT' && node.expr) {
    // For NOT expressions, we'll wrap the inner expression
    // Notion doesn't have a direct NOT operator, so we'll need to invert conditions
    const innerFilter = convertWhereNode(node.expr, propertyTypes)
    return invertFilter(innerFilter)
  }

  throw new SQLParsingError(`Unsupported unary operator: ${node.operator}`)
}

/**
 * Convert function expressions (custom Notion functions)
 */
function convertFunctionExpression(node: WhereClause, propertyTypes: Record<string, PropertyType>): NotionAPIFilter {
  // This handles cases where functions are used in WHERE clauses
  throw new SQLParsingError('Function expressions in WHERE clauses not yet supported')
}

/**
 * Convert property comparison to appropriate Notion filter
 */
function convertPropertyComparison(
  propertyName: string,
  operator: ComparisonOperator,
  value: unknown,
  propertyTypes: Record<string, PropertyType>,
): NotionAPIFilter {
  // Handle system properties (timestamps)
  if (propertyName === 'created_time') {
    return {
      created_time: convertToDateFilter(operator, value),
      timestamp: 'created_time',
    } as TimestampCreatedTimeFilter
  }

  if (propertyName === 'last_edited_time') {
    return {
      last_edited_time: convertToDateFilter(operator, value),
      timestamp: 'last_edited_time',
    } as TimestampLastEditedTimeFilter
  }

  // Handle regular properties
  const propertyType = propertyTypes[propertyName]
  if (!propertyType) {
    throw new PropertyValidationError(`Unknown property '${propertyName}' in WHERE clause`, propertyName, value)
  }

  // Build PropertyFilter based on property type
  const baseFilter = {
    property: propertyName,
  }

  // Add type-specific filter condition
  switch (propertyType) {
    case 'title':
      return {
        ...baseFilter,
        title: convertToTextFilter(operator, value),
      } as PropertyFilter

    case 'rich_text':
      return {
        ...baseFilter,
        rich_text: convertToTextFilter(operator, value),
      } as PropertyFilter

    case 'number':
      return {
        ...baseFilter,
        number: convertToNumberFilter(operator, value),
      } as PropertyFilter

    case 'checkbox':
      return {
        ...baseFilter,
        checkbox: convertToCheckboxFilter(operator, value),
      } as PropertyFilter

    case 'select':
      return {
        ...baseFilter,
        select: convertToSelectFilter(operator, value),
      } as PropertyFilter

    case 'multi_select':
      return {
        ...baseFilter,
        multi_select: convertToMultiSelectFilter(operator, value),
      } as PropertyFilter

    case 'status':
      return {
        ...baseFilter,
        status: convertToSelectFilter(operator, value),
      } as PropertyFilter

    case 'date':
      return {
        ...baseFilter,
        date: convertToDateFilter(operator, value),
      } as PropertyFilter

    case 'people':
      return {
        ...baseFilter,
        people: convertToPeopleFilter(operator, value),
      } as PropertyFilter

    case 'relation':
      return {
        ...baseFilter,
        relation: convertToRelationFilter(operator, value),
      } as PropertyFilter

    case 'files':
      return {
        ...baseFilter,
        files: convertToFilesFilter(operator, value),
      } as PropertyFilter

    case 'url':
      return {
        ...baseFilter,
        url: convertToTextFilter(operator, value),
      } as PropertyFilter

    case 'email':
      return {
        ...baseFilter,
        email: convertToTextFilter(operator, value),
      } as PropertyFilter

    case 'phone_number':
      return {
        ...baseFilter,
        phone_number: convertToTextFilter(operator, value),
      } as PropertyFilter

    default:
      throw new PropertyValidationError(
        `Filtering not supported for property type '${propertyType}'`,
        propertyName,
        value,
      )
  }
}

// Type-specific filter converters using official Notion types
function convertToTextFilter(operator: ComparisonOperator, value: unknown) {
  const stringValue = String(value)

  switch (operator) {
    case '=':
      return { equals: stringValue }
    case '!=':
    case '<>':
      return { does_not_equal: stringValue }
    case 'LIKE':
    case 'CONTAINS':
      return { contains: stringValue }
    case 'NOT LIKE':
    case 'NOT CONTAINS':
      return { does_not_contain: stringValue }
    case 'STARTS_WITH':
      return { starts_with: stringValue }
    case 'ENDS_WITH':
      return { ends_with: stringValue }
    case 'IS_EMPTY':
      return { is_empty: true }
    case 'IS_NOT_EMPTY':
      return { is_not_empty: true }
    default:
      throw new SQLParsingError(`Operator '${operator}' not supported for text properties`)
  }
}

function convertToNumberFilter(operator: ComparisonOperator, value: unknown) {
  const numValue = Number(value)

  if (isNaN(numValue)) {
    throw new PropertyValidationError(`Invalid number value '${value}' for numeric comparison`)
  }

  switch (operator) {
    case '=':
      return { equals: numValue }
    case '!=':
    case '<>':
      return { does_not_equal: numValue }
    case '>':
      return { greater_than: numValue }
    case '>=':
      return { greater_than_or_equal_to: numValue }
    case '<':
      return { less_than: numValue }
    case '<=':
      return { less_than_or_equal_to: numValue }
    case 'IS_EMPTY':
      return { is_empty: true }
    case 'IS_NOT_EMPTY':
      return { is_not_empty: true }
    default:
      throw new SQLParsingError(`Operator '${operator}' not supported for number properties`)
  }
}

function convertToCheckboxFilter(operator: ComparisonOperator, value: unknown) {
  const boolValue = Boolean(value)

  switch (operator) {
    case '=':
      return { equals: boolValue }
    case '!=':
    case '<>':
      return { does_not_equal: boolValue }
    default:
      throw new SQLParsingError(`Operator '${operator}' not supported for checkbox properties`)
  }
}

function convertToSelectFilter(operator: ComparisonOperator, value: unknown) {
  const stringValue = String(value)

  switch (operator) {
    case '=':
      return { equals: stringValue }
    case '!=':
    case '<>':
      return { does_not_equal: stringValue }
    case 'IS_EMPTY':
      return { is_empty: true }
    case 'IS_NOT_EMPTY':
      return { is_not_empty: true }
    default:
      throw new SQLParsingError(`Operator '${operator}' not supported for select properties`)
  }
}

function convertToMultiSelectFilter(operator: ComparisonOperator, value: unknown) {
  const stringValue = String(value)

  switch (operator) {
    case 'CONTAINS':
      return { contains: stringValue }
    case 'NOT CONTAINS':
      return { does_not_contain: stringValue }
    case 'IS_EMPTY':
      return { is_empty: true }
    case 'IS_NOT_EMPTY':
      return { is_not_empty: true }
    default:
      throw new SQLParsingError(`Operator '${operator}' not supported for multi-select properties`)
  }
}

function convertToDateFilter(operator: ComparisonOperator, value: unknown) {
  // Handle special date functions
  if (typeof value === 'string' && value.startsWith('__') && value.endsWith('__')) {
    return convertDateFunction(value)
  }

  const stringValue = String(value)

  switch (operator) {
    case '=':
      return { equals: stringValue }
    case '>':
      return { after: stringValue }
    case '>=':
      return { on_or_after: stringValue }
    case '<':
      return { before: stringValue }
    case '<=':
      return { on_or_before: stringValue }
    case 'IS_EMPTY':
      return { is_empty: true }
    case 'IS_NOT_EMPTY':
      return { is_not_empty: true }
    default:
      throw new SQLParsingError(`Operator '${operator}' not supported for date properties`)
  }
}

function convertToPeopleFilter(operator: ComparisonOperator, value: unknown) {
  const stringValue = String(value).replace(/^@/, '') // Remove @ prefix

  switch (operator) {
    case 'CONTAINS':
      return { contains: stringValue }
    case 'NOT CONTAINS':
      return { does_not_contain: stringValue }
    case 'IS_EMPTY':
      return { is_empty: true }
    case 'IS_NOT_EMPTY':
      return { is_not_empty: true }
    default:
      throw new SQLParsingError(`Operator '${operator}' not supported for people properties`)
  }
}

function convertToRelationFilter(operator: ComparisonOperator, value: unknown) {
  const stringValue = String(value).replace(/^#/, '') // Remove # prefix

  switch (operator) {
    case 'CONTAINS':
      return { contains: stringValue }
    case 'NOT CONTAINS':
      return { does_not_contain: stringValue }
    case 'IS_EMPTY':
      return { is_empty: true }
    case 'IS_NOT_EMPTY':
      return { is_not_empty: true }
    default:
      throw new SQLParsingError(`Operator '${operator}' not supported for relation properties`)
  }
}

function convertToFilesFilter(operator: ComparisonOperator, value: unknown) {
  switch (operator) {
    case 'IS_EMPTY':
      return { is_empty: true }
    case 'IS_NOT_EMPTY':
      return { is_not_empty: true }
    default:
      throw new SQLParsingError(`Operator '${operator}' not supported for files properties`)
  }
}

// Utility functions
function extractPropertyName(node: ColumnRef | ValueRef | WhereClause): string | undefined {
  if (node.type === 'column_ref') {
    return (node as ColumnRef).column
  }

  if (typeof node === 'string') {
    return node
  }

  return undefined
}

function extractValue(node: ColumnRef | ValueRef | WhereClause): unknown {
  if ('value' in node) {
    return (node as ValueRef).value
  }

  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    return node
  }

  return undefined
}

function convertDateFunction(placeholder: string) {
  const functionName = placeholder.replace(/^__|__$/g, '')

  switch (functionName) {
    case 'NEXT_WEEK':
      return { next_week: {} }
    case 'NEXT_MONTH':
      return { next_month: {} }
    case 'NEXT_YEAR':
      return { next_year: {} }
    case 'PAST_WEEK':
      return { past_week: {} }
    case 'PAST_MONTH':
      return { past_month: {} }
    case 'PAST_YEAR':
      return { past_year: {} }
    case 'THIS_WEEK':
      return { this_week: {} }
    case 'TODAY':
      return { equals: new Date().toISOString().split('T')[0] }
    case 'NOW':
      return { equals: new Date().toISOString() }
    default:
      throw new SQLParsingError(`Unknown date function: ${functionName}`)
  }
}

function invertFilter(filter: NotionAPIFilter): NotionAPIFilter {
  // Notion doesn't have direct NOT support, so we need to invert conditions
  // This is a simplified implementation - full NOT support would be more complex

  if ('and' in filter) {
    // NOT (A AND B) = (NOT A) OR (NOT B) - De Morgan's law
    return {
      or: filter.and.map((f) => invertFilter(f)),
    } as unknown as NotionAPIFilter
  }

  if ('or' in filter) {
    // NOT (A OR B) = (NOT A) AND (NOT B) - De Morgan's law
    return {
      and: filter.or.map((f) => invertFilter(f)),
    } as unknown as NotionAPIFilter
  }

  // For property filters, this would need more complex inversion logic
  // For now, return the original filter (NOT support is limited)
  return filter
}

/**
 * Combine multiple filters with AND logic
 */
export function combineFiltersWithAnd(filters: NotionAPIFilter[]): NotionAPIFilter {
  if (filters.length === 0) {
    throw new SQLParsingError('Cannot combine empty filter list')
  }

  if (filters.length === 1) {
    return filters[0]
  }

  return {
    and: filters,
  } as NotionAPIFilter
}

/**
 * Combine multiple filters with OR logic
 */
export function combineFiltersWithOr(filters: NotionAPIFilter[]): NotionAPIFilter {
  if (filters.length === 0) {
    throw new SQLParsingError('Cannot combine empty filter list')
  }

  if (filters.length === 1) {
    return filters[0]
  }

  return {
    or: filters,
  } as NotionAPIFilter
}

/**
 * Validate filter structure
 */
export function validateNotionFilter(filter: NotionAPIFilter): boolean {
  // Basic validation - ensure filter has required structure
  if (!filter || typeof filter !== 'object') {
    return false
  }

  // Must have either property, timestamp, or logical operators
  const hasValidStructure = 'property' in filter || 'timestamp' in filter || 'and' in filter || 'or' in filter

  return hasValidStructure
}
