/**
 * Main entry point for Notion-specific function implementations
 * Exports all function processors and utilities
 */

// Date functions
export {
  convertDateFunctionToFilter,
  convertDateFunctionToValue,
  isDateFunction,
  processDateArithmetic,
  extractDatePart,
  parseDateArithmeticExpression,
  parseDatePartExpression,
  getDateRange,
  validateDateFunction,
  getSupportedDateFunctions,
  type DateFunctionName,
  type DateArithmeticFunction,
  type DatePartFunction,
  type AllDateFunctions,
  type DateInterval,
} from './date-functions.js'

// Rollup functions
export {
  convertRollupFunctionToFilter,
  parseRollupFunctionCall,
  hasRollupFunction,
  extractRollupFunctions,
  validateRollupFunction,
  convertRollupToPlaceholder,
  restoreRollupFromPlaceholder,
  buildRollupPropertyConfig,
  getAvailableRollupFunctions,
  optimizeRollupQuery,
  getSupportedRollupFunctions,
  createRollupExamples,
  type RollupFunctionName,
  type RollupAggregation,
  type RollupFunctionCall,
} from './rollup-functions.js'

// Utility functions
export {
  getCurrentUserFilter,
  getCurrentUserValue,
  processTextFunction,
  processUtilityFunction,
  isUtilityFunction,
  parseUtilityFunctionCall,
  convertUtilityFunctionToFilter,
  processSelectFunction,
  validateUtilityFunction,
  getSupportedUtilityFunctions,
  type UtilityFunctionName,
  type UserContext,
  type FunctionResult,
} from './utility-functions.js'

import {
  convertDateFunctionToFilter,
  convertDateFunctionToValue,
  type DateFunctionName,
  getSupportedDateFunctions,
  isDateFunction,
  validateDateFunction,
  type AllDateFunctions,
} from './date-functions.js'
import {
  createRollupExamples,
  extractRollupFunctions,
  getSupportedRollupFunctions,
  optimizeRollupQuery,
  type RollupFunctionCall,
  validateRollupFunction,
  type RollupFunctionName,
} from './rollup-functions.js'
import {
  getSupportedUtilityFunctions,
  isUtilityFunction,
  parseUtilityFunctionCall,
  processSelectFunction,
  validateUtilityFunction,
  type UserContext,
  type UtilityFunctionName,
} from './utility-functions.js'
import { PropertyValidationError, SQLParsingError } from '../utils/error-handling.js'

import type { PropertyType, NotionFilter, DateFilter, RollupFilter, TextFilter, PeopleFilter } from '../types/index.js'

// Re-exports for convenience
export type { PropertyType, NotionFilter, DateFilter, RollupFilter, TextFilter, PeopleFilter }

/**
 * All supported function types
 */
export type AllFunctionTypes = AllDateFunctions | RollupFunctionName | UtilityFunctionName

/**
 * Function processing context
 */
export interface FunctionContext {
  userContext?: UserContext
  propertyTypes?: Record<string, PropertyType>
  currentRow?: Record<string, unknown>
  operation?: 'filter' | 'select' | 'orderby'
}

/**
 * Main function processor - routes function calls to appropriate handlers
 */
export function processFunction(
  functionName: string,
  args: unknown[],
  context: FunctionContext = {},
): {
  type: 'filter' | 'value' | 'error'
  result?: NotionFilter | unknown
  error?: string
} {
  try {
    // Route to appropriate processor based on function type

    // Date functions
    if (isDateFunction(functionName)) {
      const dateFunction = functionName as DateFunctionName

      if (context.operation === 'filter') {
        return {
          type: 'filter',
          result: convertDateFunctionToFilter(dateFunction),
        }
      } else {
        return {
          type: 'value',
          result: convertDateFunctionToValue(dateFunction),
        }
      }
    }

    // Rollup functions
    if (functionName.startsWith('ROLLUP_')) {
      if (!context.propertyTypes) {
        throw new PropertyValidationError(
          'Rollup functions require property type context',
          'function_context',
          functionName,
        )
      }

      // This would typically be called from the preprocessor
      // where the full expression is available
      throw new SQLParsingError('Rollup functions should be processed during preprocessing', functionName)
    }

    // Utility functions
    if (isUtilityFunction(`${functionName}()`)) {
      const utilityFunction = functionName as UtilityFunctionName

      if (context.operation === 'select' && context.currentRow) {
        return {
          type: 'value',
          result: processSelectFunction({ function: utilityFunction, args }, context.currentRow, context.userContext),
        }
      } else if (context.operation === 'filter') {
        // This would need additional context about the comparison operator and value
        throw new SQLParsingError('Utility functions in filters require additional context', functionName)
      }
    }

    return {
      type: 'error',
      error: `Unknown function: ${functionName}`,
    }
  } catch (error) {
    return {
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Extract all function calls from SQL expression
 */
export function extractAllFunctions(expression: string): {
  dateFunctions: string[]
  rollupFunctions: RollupFunctionCall[]
  utilityFunctions: Array<{ function: string; args: unknown[] }>
} {
  const dateFunctions: string[] = []
  const rollupFunctions = extractRollupFunctions(expression)
  const utilityFunctions: Array<{ function: string; args: unknown[] }> = []

  // Extract date functions
  const dateFunctionRegex =
    /\b(NEXT_WEEK|NEXT_MONTH|NEXT_YEAR|PAST_WEEK|PAST_MONTH|PAST_YEAR|THIS_WEEK|THIS_MONTH|THIS_YEAR|TODAY|NOW)\s*\(\)/gi
  let match
  while ((match = dateFunctionRegex.exec(expression))) {
    dateFunctions.push(match[1].toUpperCase())
  }

  // Extract utility functions
  const utilityFunctionRegex =
    /\b(CURRENT_USER|LENGTH|UPPER|LOWER|TRIM|LTRIM|RTRIM|CONCAT|SUBSTRING|COALESCE|NULLIF)\s*\([^)]*\)/gi
  while ((match = utilityFunctionRegex.exec(expression))) {
    try {
      const parsed = parseUtilityFunctionCall(match[0])
      utilityFunctions.push({
        function: parsed.function,
        args: parsed.args,
      })
    } catch {
      // Skip invalid function calls
    }
  }

  return {
    dateFunctions,
    rollupFunctions,
    utilityFunctions,
  }
}

/**
 * Validate all functions in an expression
 */
export function validateAllFunctions(
  expression: string,
  context: FunctionContext = {},
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const extracted = extractAllFunctions(expression)

    // Validate date functions
    for (const dateFunc of extracted.dateFunctions) {
      const validation = validateDateFunction(dateFunc)
      if (!validation.valid) {
        errors.push(...validation.errors)
      }
    }

    // Validate rollup functions
    for (const rollupFunc of extracted.rollupFunctions) {
      const validation = validateRollupFunction(rollupFunc)
      if (!validation.valid) {
        errors.push(...validation.errors)
      }

      // Check for performance warnings
      if (context.propertyTypes) {
        const optimization = optimizeRollupQuery(
          rollupFunc,
          'relation', // Default assumption
        )
        if (!optimization.optimized && optimization.suggestion) {
          warnings.push(optimization.suggestion)
        }
      }
    }

    // Validate utility functions
    for (const utilityFunc of extracted.utilityFunctions) {
      const validation = validateUtilityFunction({
        function: utilityFunc.function as UtilityFunctionName,
        args: utilityFunc.args,
      })
      if (!validation.valid) {
        errors.push(...validation.errors)
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Get comprehensive list of all supported functions
 */
export function getAllSupportedFunctions(): {
  date: ReturnType<typeof getSupportedDateFunctions>
  rollup: ReturnType<typeof getSupportedRollupFunctions>
  utility: ReturnType<typeof getSupportedUtilityFunctions>
} {
  return {
    date: getSupportedDateFunctions(),
    rollup: getSupportedRollupFunctions(),
    utility: getSupportedUtilityFunctions(),
  }
}

/**
 * Create comprehensive function examples for documentation
 */
export function createFunctionExamples(): Record<string, Record<string, string>> {
  return {
    date: {
      'Filter by next week': `
 SELECT * FROM "tasks-db"
 WHERE "Due Date" IN NEXT_WEEK()
 `,
      'Filter by past month': `
 SELECT * FROM "articles-db"
 WHERE "Published Date" IN PAST_MONTH()
 `,
      'Current date comparison': `
 SELECT * FROM "events-db"
 WHERE "Event Date" > TODAY()
 `,
      'Date arithmetic': `
 SELECT * FROM "tasks-db"
 WHERE "Due Date" < DATE_ADD(NOW(), INTERVAL 7 DAY)
 `,
      'Date parts': `
 SELECT * FROM "reports-db"
 WHERE YEAR("Report Date") = 2023
 `,
    },

    rollup: createRollupExamples(),

    utility: {
      'Current user filter': `
 SELECT * FROM "tasks-db"
 WHERE Assignee CONTAINS CURRENT_USER()
 `,
      'Text length filter': `
 SELECT * FROM "articles-db"
 WHERE LENGTH(Title) > 50
 `,
      'Case insensitive search': `
 SELECT * FROM "contacts-db"
 WHERE UPPER(Name) LIKE '%JOHN%'
 `,
      'Text transformation in SELECT': `
 SELECT CONCAT("Task: ", Name) as FullName
 FROM "tasks-db"
 `,
      'Null handling': `
 SELECT COALESCE(Notes, Description, 'No content') as Content
 FROM "tasks-db"
 `,
    },
  }
}

/**
 * Check if expression has any custom functions
 */
export function hasCustomFunctions(expression: string): boolean {
  const extracted = extractAllFunctions(expression)
  return (
    extracted.dateFunctions.length > 0 || extracted.rollupFunctions.length > 0 || extracted.utilityFunctions.length > 0
  )
}

/**
 * Performance analysis for function usage
 */
export function analyzeFunctionPerformance(expression: string): {
  complexity: 'low' | 'medium' | 'high'
  warnings: string[]
  suggestions: string[]
} {
  const warnings: string[] = []
  const suggestions: string[] = []
  let complexity: 'low' | 'medium' | 'high' = 'low'

  const extracted = extractAllFunctions(expression)

  // Analyze rollup functions (potentially expensive)
  if (extracted.rollupFunctions.length > 0) {
    complexity = 'medium'

    if (extracted.rollupFunctions.length > 2) {
      complexity = 'high'
      warnings.push('Multiple rollup functions may impact performance')
      suggestions.push('Consider combining rollup conditions or using cached computed properties')
    }

    // Check for complex rollup conditions
    for (const rollupFunc of extracted.rollupFunctions) {
      if (rollupFunc.originalExpression.length > 100) {
        complexity = 'high'
        warnings.push('Complex rollup conditions may be slow')
        suggestions.push('Simplify rollup conditions or use indexed properties')
      }
    }
  }

  // Analyze text functions
  const textFunctions = extracted.utilityFunctions.filter((f) =>
    ['LENGTH', 'UPPER', 'LOWER', 'CONCAT', 'SUBSTRING'].includes(f.function),
  )

  if (textFunctions.length > 3) {
    if (complexity === 'low') complexity = 'medium'
    warnings.push('Multiple text transformations may impact performance')
    suggestions.push('Consider preprocessing text data or using computed properties')
  }

  return {
    complexity,
    warnings,
    suggestions,
  }
}
