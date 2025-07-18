/**
 * Main entry point for the SQL-to-Notion parser library
 * Exports all public APIs, types, and utilities
 */

import { NotionSQLParser } from './parser/index.js'
import { type NotionSQLConfig } from './types/index.js'

// Main integrated parser class (Phase 5 integration)
export { NotionSQLParser, createNotionSQLParser, executeNotionSQL } from './main-parser.js'

// Base parser components (for advanced usage)
export { parseNotionSQL, validateNotionSQL } from './parser/index.js'

// Type definitions
export type {
  // Core types
  SQLResult,
  SQLError,
  SQLResponse,
  SQLOperation,
  NotionSQLConfig,
  ResponseFormatConfig,
  SimplifiedPage,
  SimplifiedPropertyValue,

  // AST types
  NotionSQLAST,
  SQLStatementType,
  WhereClause,
  OrderByClause,
  SetClause,
  NotionFunction,
  NotionFunctionName,
  PreprocessResult,
  ValidationResult,

  // Notion API types
  PropertyType,
  NotionFilter,
  NotionSort,
  DatabaseSchema,
  DatabasePropertySchema,

  // Operation types
  Operation,
  OperationResult,
  SelectOperation,
  InsertOperation,
  UpdateOperation,
  DeleteOperation,
  UndeleteOperation,
  DescribeOperation,
  SelectResult,
  InsertResult,
  UpdateResult,
  DeleteResult,
  UndeleteResult,
  DescribeResult,
} from './types/index.js'

// Error classes
export { NotionSQLError, SQLParsingError, PropertyValidationError, NotionAPIError } from './types/index.js'

// Utility functions
export {
  // Error handling
  formatError,
  isNotionAPIError,
  isSQLParsingError,
  isPropertyValidationError,
  isRetryableError,
  getUserFriendlyMessage,
  getRecoverySuggestions,
  validateSQLSyntax,
  createDetailedError,
} from './utils/error-handling.js'

export {
  // Validation
  isValidSQLIdentifier,
  cleanSQLIdentifier,
  isValidDatabaseId,
  isValidPageId,
  inferPropertyType,
  validatePropertyValue,
  validatePropertyName,
  validatePropertyWritability,
  validateCollectionOperation,
  validateBatchSize,
  validatePagination,
  validatePropertyInput,
  validateInput,
  isValidEmail,
  isValidURL,
  isValidPhoneNumber,
  isValidDateString,
  isValidUUID,
} from './utils/validation.js'

export {
  // Constants
  SQL_TO_NOTION_TYPE_MAP,
  TYPE_INFERENCE_PATTERNS,
  COLUMN_NAME_PATTERNS,
  NOTION_DATE_FUNCTIONS,
  OPERATOR_MAPPING,
  SYSTEM_PROPERTIES,
  READ_ONLY_PROPERTIES,
  COLLECTION_PROPERTY_TYPES,
  TEXT_PROPERTY_TYPES,
  NUMERIC_PROPERTY_TYPES,
  DATE_PROPERTY_TYPES,
  ERROR_CODES,
  DEFAULT_CONFIG,
  RESPONSE_FORMAT_DEFAULTS,

  // Type guards
  isValidPropertyType,
  isCollectionPropertyType,
  isTextPropertyType,
  isNumericPropertyType,
  isDatePropertyType,
  isSystemProperty,
  isReadOnlyProperty,
} from './utils/constants.js'

// SQL preprocessing
export {
  preprocessSQL,
  validatePreprocessedSQL,
  restoreFunctionCalls,
  getPreprocessingStats,
} from './parser/preprocessor.js'

// Operation type guards
export {
  isSelectResult,
  isInsertResult,
  isUpdateResult,
  isDeleteResult,
  isUndeleteResult,
  isDescribeResult,
} from './types/operations.js'

/**
 * Default configuration for NotionSQLParser
 */
export const DEFAULT_NOTION_SQL_CONFIG: Partial<NotionSQLConfig> = {
  debug: false,
  timeout: 30000,
  retries: 3,
  rateLimitDelay: 100,
} as const

/**
 * Version information
 */
export const VERSION = '1.0.0'

/**
 * Library metadata
 */
export const LIBRARY_INFO = {
  name: 'notion-sql-parser',
  version: VERSION,
  description: 'Complete SQL-to-Notion parser library with full SQL support for Notion databases',
  author: 'Notion SQL Parser Team',
  repository: 'https://github.com/your-org/notion-sql-parser',
  documentation: 'https://docs.notion-sql-parser.com',
  license: 'MIT',
} as const

/**
 * Supported SQL operations
 */
export const SUPPORTED_OPERATIONS = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'UNDELETE',
  'DESCRIBE',
  'DROP',
  'UNDROP',
] as const

/**
 * Supported Notion property types
 */
export const SUPPORTED_PROPERTY_TYPES = [
  'title',
  'rich_text',
  'number',
  'checkbox',
  'select',
  'multi_select',
  'date',
  'people',
  'relation',
  'url',
  'email',
  'phone_number',
  'files',
  'formula',
  'rollup',
  'unique_id',
  'status',
] as const

/**
 * Initialize the library with comprehensive validation
 */
export function initializeNotionSQL(config: NotionSQLConfig): NotionSQLParser {
  // Validate required configuration
  if (!config.client) {
    throw new Error('NotionSQLConfig.client is required. Please provide a @notionhq/client instance.')
  }

  // Create parser with merged configuration
  const finalConfig = {
    ...DEFAULT_NOTION_SQL_CONFIG,
    ...config,
  }

  return new NotionSQLParser(finalConfig as NotionSQLConfig)
}

/**
 * Comprehensive configuration validation
 */
export function validateConfiguration(config: NotionSQLConfig): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Required checks
  if (!config.client) {
    errors.push('client is required')
  }

  // Optional checks with warnings
  if (config.timeout && config.timeout < 1000) {
    warnings.push('timeout below 1000ms may cause timeouts with Notion API')
  }

  if (config.retries && config.retries > 10) {
    warnings.push('retries above 10 may cause excessive delays')
  }

  if (config.rateLimitDelay && config.rateLimitDelay < 50) {
    warnings.push('rateLimitDelay below 50ms may not be sufficient for Notion rate limits')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// Default export for convenience
export default NotionSQLParser
