/**
 * Utility function implementations for Notion SQL queries
 * Handles CURRENT_USER(), text functions, and system utilities
 */

import { PropertyValidationError } from '../utils/error-handling.js'

import type { PeopleFilter, TextFilter } from '../types/notion.js'

/**
 * Utility function names supported in SQL queries
 */
export type UtilityFunctionName =
  | 'CURRENT_USER'
  | 'LENGTH'
  | 'UPPER'
  | 'LOWER'
  | 'TRIM'
  | 'LTRIM'
  | 'RTRIM'
  | 'CONCAT'
  | 'SUBSTRING'
  | 'COALESCE'
  | 'NULLIF'

/**
 * User context information
 */
export interface UserContext {
  userId?: string
  email?: string
  name?: string
  workspaceId?: string
}

/**
 * Function call result types
 */
export type FunctionResult = string | number | boolean | unknown[] | undefined

/**
 * Convert CURRENT_USER() to appropriate filter value
 */
export function getCurrentUserFilter(userContext?: UserContext): PeopleFilter {
  if (!userContext?.userId && !userContext?.email) {
    throw new PropertyValidationError(
      'CURRENT_USER() requires user context (user ID or email)',
      'user_context',
      userContext,
    )
  }

  const userIdentifier = userContext.email || userContext.userId

  return {
    contains: userIdentifier,
  }
}

/**
 * Get current user identifier for property values
 */
export function getCurrentUserValue(userContext?: UserContext): string {
  if (!userContext?.userId && !userContext?.email) {
    throw new PropertyValidationError(
      'CURRENT_USER() requires user context (user ID or email)',
      'user_context',
      userContext,
    )
  }

  return userContext.email || userContext.userId
}

/**
 * Process text functions (LENGTH, UPPER, LOWER, etc.)
 */
export function processTextFunction(
  functionName: UtilityFunctionName,
  value: string,
  ...args: unknown[]
): string | number {
  if (typeof value !== 'string') {
    throw new PropertyValidationError(`${functionName} requires a string value`, 'text_function', value)
  }

  switch (functionName) {
    case 'LENGTH':
      return value.length

    case 'UPPER':
      return value.toUpperCase()

    case 'LOWER':
      return value.toLowerCase()

    case 'TRIM':
      return value.trim()

    case 'LTRIM':
      return value.replace(/^\s+/, '')

    case 'RTRIM':
      return value.replace(/\s+$/, '')

    case 'CONCAT': {
      const otherValues = args.map((arg) => String(arg))
      return [value, ...otherValues].join('')
    }

    case 'SUBSTRING': {
      const start = Number(args[0]) || 0
      const length = args[1] !== undefined ? Number(args[1]) : undefined
      return length !== undefined ? value.substring(start, start + length) : value.substring(start)
    }

    default:
      throw new PropertyValidationError(`Unknown text function: ${functionName}`, 'text_function', functionName)
  }
}

/**
 * Process utility functions (COALESCE, NULLIF)
 */
export function processUtilityFunction(functionName: UtilityFunctionName, ...args: unknown[]): FunctionResult {
  switch (functionName) {
    case 'COALESCE':
      // Return first non-null/non-undefined value
      for (const arg of args) {
        if (arg !== null && arg !== undefined) {
          return arg
        }
      }
      return undefined

    case 'NULLIF':
      // Return null if first two args are equal, otherwise return first arg
      if (args.length < 2) {
        throw new PropertyValidationError('NULLIF requires exactly 2 arguments', 'nullif_args', args)
      }
      return args[0] === args[1] ? undefined : args[0]

    default:
      throw new PropertyValidationError(`Unknown utility function: ${functionName}`, 'utility_function', functionName)
  }
}

/**
 * Check if a string represents a utility function call
 */
export function isUtilityFunction(expression: string): boolean {
  const functionNames = [
    'CURRENT_USER',
    'LENGTH',
    'UPPER',
    'LOWER',
    'TRIM',
    'LTRIM',
    'RTRIM',
    'CONCAT',
    'SUBSTRING',
    'COALESCE',
    'NULLIF',
  ]

  const functionPattern = new RegExp(`\\b(${functionNames.join('|')})\\s*\\(`, 'i')

  return functionPattern.test(expression)
}

/**
 * Parse utility function call from SQL expression
 */
export function parseUtilityFunctionCall(expression: string): {
  function: UtilityFunctionName
  args: unknown[]
  originalExpression: string
} {
  // Match function_name(args...)
  const regex = /\b(\w+)\s*\(([^)]*)\)/i
  const match = expression.match(regex)

  if (!match) {
    throw new PropertyValidationError(`Invalid function syntax: ${expression}`, 'function_syntax', expression)
  }

  const functionName = match[1].toUpperCase() as UtilityFunctionName
  const argsString = match[2].trim()

  // Parse arguments
  const args: unknown[] = []
  if (argsString) {
    const argParts = splitFunctionArgs(argsString)
    for (const arg of argParts) {
      args.push(parseArgument(arg.trim()))
    }
  }

  return {
    function: functionName,
    args,
    originalExpression: expression,
  }
}

/**
 * Split function arguments, handling nested parentheses and quotes
 */
function splitFunctionArgs(argsString: string): string[] {
  const args: string[] = []
  let currentArg = ''
  let parenDepth = 0
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i]

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true
      quoteChar = char
      currentArg += char
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false
      quoteChar = ''
      currentArg += char
    } else if (!inQuotes && char === '(') {
      parenDepth++
      currentArg += char
    } else if (!inQuotes && char === ')') {
      parenDepth--
      currentArg += char
    } else if (!inQuotes && char === ',' && parenDepth === 0) {
      args.push(currentArg)
      currentArg = ''
    } else {
      currentArg += char
    }
  }

  if (currentArg) {
    args.push(currentArg)
  }

  return args
}

/**
 * Parse individual function argument
 */
function parseArgument(arg: string): unknown {
  const trimmed = arg.trim()

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

  // Handle NULL
  if (trimmed.toLowerCase() === 'null') return null

  // Handle column references (property names)
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    return { type: 'column_ref', column: trimmed }
  }

  // Default to string
  return trimmed
}

/**
 * Convert utility function to filter condition
 */
export function convertUtilityFunctionToFilter(
  functionCall: { function: UtilityFunctionName; args: unknown[] },
  operator: string,
  compareValue: unknown,
  userContext?: UserContext,
): TextFilter | PeopleFilter | Record<string, unknown> {
  const { function: functionName, args } = functionCall

  switch (functionName) {
    case 'CURRENT_USER':
      if (operator === 'CONTAINS') {
        return getCurrentUserFilter(userContext)
      }
      return { equals: getCurrentUserValue(userContext) }

    case 'LENGTH':
      if (args.length === 0) {
        throw new PropertyValidationError('LENGTH function requires an argument')
      }
      // For LENGTH comparisons, we need to convert to a computed property
      // This would require special handling in the query processor
      return {
        _computed: {
          function: 'length',
          property: args[0],
          operator,
          value: compareValue,
        },
      }

    case 'UPPER':
    case 'LOWER': {
      if (args.length === 0) {
        throw new PropertyValidationError(`${functionName} function requires an argument`)
      }
      // For case-insensitive comparisons, we modify the comparison value
      const transformedValue =
        functionName === 'UPPER' ? String(compareValue).toUpperCase() : String(compareValue).toLowerCase()

      return createTextFilter(operator, transformedValue)
    }

    default:
      throw new PropertyValidationError(
        `Function ${functionName} cannot be used in filter conditions`,
        'function_filter',
        functionName,
      )
  }
}

/**
 * Create text filter based on operator and value
 */
function createTextFilter(operator: string, value: string): TextFilter {
  switch (operator.toUpperCase()) {
    case '=':
    case 'EQUALS':
      return { equals: value }
    case '!=':
    case '<>':
    case 'NOT_EQUALS':
      return { does_not_equal: value }
    case 'LIKE':
    case 'CONTAINS':
      return { contains: value }
    case 'NOT LIKE':
    case 'NOT_CONTAINS':
      return { does_not_contain: value }
    case 'STARTS_WITH':
      return { starts_with: value }
    case 'ENDS_WITH':
      return { ends_with: value }
    default:
      throw new PropertyValidationError(`Unsupported text operator: ${operator}`, 'text_operator', operator)
  }
}

/**
 * Process function in SELECT clause (for value transformation)
 */
export function processSelectFunction(
  functionCall: { function: UtilityFunctionName; args: unknown[] },
  rowData: Record<string, unknown>,
  userContext?: UserContext,
): FunctionResult {
  const { function: functionName, args } = functionCall

  switch (functionName) {
    case 'CURRENT_USER':
      return getCurrentUserValue(userContext)

    case 'LENGTH':
    case 'UPPER':
    case 'LOWER':
    case 'TRIM':
    case 'LTRIM':
    case 'RTRIM': {
      if (args.length === 0) {
        throw new PropertyValidationError(`${functionName} requires an argument`)
      }

      const value = resolveArgument(args[0], rowData)
      return processTextFunction(functionName, String(value))
    }

    case 'CONCAT': {
      const concatValues = args.map((arg) => String(resolveArgument(arg, rowData)))
      return concatValues.join('')
    }

    case 'SUBSTRING': {
      if (args.length < 2) {
        throw new PropertyValidationError('SUBSTRING requires at least 2 arguments')
      }

      const text = String(resolveArgument(args[0], rowData))
      const start = Number(resolveArgument(args[1], rowData))
      const length = args[2] !== undefined ? Number(resolveArgument(args[2], rowData)) : undefined

      return processTextFunction('SUBSTRING', text, start, length)
    }

    case 'COALESCE':
    case 'NULLIF': {
      const resolvedArgs = args.map((arg) => resolveArgument(arg, rowData))
      return processUtilityFunction(functionName, ...resolvedArgs)
    }

    default:
      throw new PropertyValidationError(`Unknown function in SELECT: ${functionName}`, 'select_function', functionName)
  }
}

/**
 * Resolve function argument (could be column reference or literal value)
 */
function resolveArgument(arg: unknown, rowData: Record<string, unknown>): unknown {
  if (typeof arg === 'object' && arg !== null && 'type' in arg && 'column' in arg) {
    // Column reference
    const columnRef = arg as { type: string; column: string }
    return rowData[columnRef.column]
  }

  // Literal value
  return arg
}

/**
 * Validate utility function call
 */
export function validateUtilityFunction(functionCall: { function: UtilityFunctionName; args: unknown[] }): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const { function: functionName, args } = functionCall

  // Validate function exists
  const validFunctions: UtilityFunctionName[] = [
    'CURRENT_USER',
    'LENGTH',
    'UPPER',
    'LOWER',
    'TRIM',
    'LTRIM',
    'RTRIM',
    'CONCAT',
    'SUBSTRING',
    'COALESCE',
    'NULLIF',
  ]

  if (!validFunctions.includes(functionName)) {
    errors.push(`Unknown utility function: ${functionName}`)
  }

  // Validate argument count
  switch (functionName) {
    case 'CURRENT_USER':
    case 'TRIM':
    case 'LTRIM':
    case 'RTRIM':
    case 'UPPER':
    case 'LOWER':
    case 'LENGTH':
      if (args.length > 1) {
        errors.push(`${functionName} takes at most 1 argument`)
      }
      break

    case 'NULLIF':
      if (args.length !== 2) {
        errors.push(`${functionName} requires exactly 2 arguments`)
      }
      break

    case 'SUBSTRING':
      if (args.length < 2 || args.length > 3) {
        errors.push(`${functionName} requires 2 or 3 arguments`)
      }
      break

    case 'CONCAT':
    case 'COALESCE':
      if (args.length === 0) {
        errors.push(`${functionName} requires at least 1 argument`)
      }
      break
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get all supported utility functions with their descriptions
 */
export function getSupportedUtilityFunctions(): Record<
  UtilityFunctionName,
  {
    description: string
    syntax: string
    example: string
  }
> {
  return {
    CURRENT_USER: {
      description: 'Returns the current user ID or email',
      syntax: 'CURRENT_USER()',
      example: 'WHERE Assignee CONTAINS CURRENT_USER()',
    },
    LENGTH: {
      description: 'Returns the length of a text value',
      syntax: 'LENGTH(text)',
      example: 'WHERE LENGTH(Description) > 100',
    },
    UPPER: {
      description: 'Converts text to uppercase',
      syntax: 'UPPER(text)',
      example: "WHERE UPPER(Name) = 'TASK 1'",
    },
    LOWER: {
      description: 'Converts text to lowercase',
      syntax: 'LOWER(text)',
      example: "WHERE LOWER(Status) = 'done'",
    },
    TRIM: {
      description: 'Removes leading and trailing whitespace',
      syntax: 'TRIM(text)',
      example: 'SELECT TRIM(Name) FROM tasks',
    },
    LTRIM: {
      description: 'Removes leading whitespace',
      syntax: 'LTRIM(text)',
      example: 'SELECT LTRIM(Description) FROM tasks',
    },
    RTRIM: {
      description: 'Removes trailing whitespace',
      syntax: 'RTRIM(text)',
      example: 'SELECT RTRIM(Notes) FROM tasks',
    },
    CONCAT: {
      description: 'Concatenates multiple text values',
      syntax: 'CONCAT(text1, text2, ...)',
      example: 'SELECT CONCAT("Task: ", Name) FROM tasks',
    },
    SUBSTRING: {
      description: 'Extracts part of a text value',
      syntax: 'SUBSTRING(text, start, length?)',
      example: 'SELECT SUBSTRING(Description, 1, 50) FROM tasks',
    },
    COALESCE: {
      description: 'Returns first non-null value',
      syntax: 'COALESCE(value1, value2, ...)',
      example: "SELECT COALESCE(Notes, Description, 'No content') FROM tasks",
    },
    NULLIF: {
      description: 'Returns null if two values are equal',
      syntax: 'NULLIF(value1, value2)',
      example: "SELECT NULLIF(Status, 'TODO') FROM tasks",
    },
  }
}
