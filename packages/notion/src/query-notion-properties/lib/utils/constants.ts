/**
 * Constants and mappings for SQL-to-Notion conversion
 * Based on official Notion API types and documentation
 */

import type { NotionFunctionName } from '../types/ast.js'
import type { PropertyType } from '../types/notion.js'

// Property type mappings (SQL type → Notion property type)
export const SQL_TO_NOTION_TYPE_MAP: Record<string, PropertyType> = {
  // Text types
  string: 'rich_text',
  text: 'rich_text',
  varchar: 'rich_text',
  char: 'rich_text',

  // Title (special case)
  title: 'title',

  // Numeric types
  number: 'number',
  int: 'number',
  integer: 'number',
  float: 'number',
  double: 'number',
  decimal: 'number',

  // Boolean
  boolean: 'checkbox',
  bool: 'checkbox',
  bit: 'checkbox',

  // Date/Time
  date: 'date',
  datetime: 'date',
  timestamp: 'date',
  time: 'date',

  // Special types
  url: 'url',
  email: 'email',
  phone: 'phone_number',
  select: 'select',
  enum: 'select',
} as const

// Property type inference patterns
export const TYPE_INFERENCE_PATTERNS = {
  // Email pattern
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  // URL pattern
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,

  // Phone pattern (international format)
  PHONE: /^\+?[1-9]\d{1,14}$/,

  // Date patterns
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  DATETIME_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,

  // User reference pattern (@user@domain.com)
  USER_REFERENCE: /^@[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  // Page reference pattern (#page-id)
  PAGE_REFERENCE: /^#[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,

  // UUID pattern
  UUID: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
} as const

// Column name patterns for type inference
export const COLUMN_NAME_PATTERNS: Record<string, PropertyType> = {
  // Title patterns
  name: 'title',
  title: 'title',

  // Rich text patterns
  description: 'rich_text',
  content: 'rich_text',
  notes: 'rich_text',
  summary: 'rich_text',
  details: 'rich_text',

  // Date patterns
  date: 'date',
  time: 'date',
  created: 'date',
  updated: 'date',
  modified: 'date',

  // URL patterns
  url: 'url',
  link: 'url',
  website: 'url',

  // Email patterns
  email: 'email',
  mail: 'email',

  // Phone patterns
  phone: 'phone_number',
  telephone: 'phone_number',
  mobile: 'phone_number',
} as const

// Notion date functions mapping
export const NOTION_DATE_FUNCTIONS: Record<NotionFunctionName, object> = {
  NEXT_WEEK: { next_week: {} },
  NEXT_MONTH: { next_month: {} },
  NEXT_YEAR: { next_year: {} },
  PAST_WEEK: { past_week: {} },
  PAST_MONTH: { past_month: {} },
  PAST_YEAR: { past_year: {} },
  THIS_WEEK: { this_week: {} },
  THIS_MONTH: { this_month: {} },
  THIS_YEAR: { this_year: {} },
  TODAY: { equals: new Date().toISOString().split('T')[0] },
  NOW: { equals: new Date().toISOString() },

  // Placeholder for other functions (will be processed differently)
  CURRENT_USER: {},
  ROLLUP_ANY: {},
  ROLLUP_ALL: {},
  ROLLUP_NONE: {},
  LENGTH: {},
  UPPER: {},
  LOWER: {},
  YEAR: {},
  MONTH: {},
  DAY: {},
  WEEKDAY: {},
  DATE_ADD: {},
  DATE_SUB: {},
} as const

// SQL operator to Notion filter condition mapping
export const OPERATOR_MAPPING: Record<string, string> = {
  '=': 'equals',
  '!=': 'does_not_equal',
  '<>': 'does_not_equal',
  '>': 'greater_than',
  '>=': 'greater_than_or_equal_to',
  '<': 'less_than',
  '<=': 'less_than_or_equal_to',
  LIKE: 'contains',
  'NOT LIKE': 'does_not_contain',
  ILIKE: 'contains', // Case insensitive (treated same as LIKE)
  CONTAINS: 'contains',
  'NOT CONTAINS': 'does_not_contain',
  STARTS_WITH: 'starts_with',
  ENDS_WITH: 'ends_with',
  IS_EMPTY: 'is_empty',
  IS_NOT_EMPTY: 'is_not_empty',
} as const

// System properties (always available)
export const SYSTEM_PROPERTIES = [
  'id',
  'created_time',
  'last_edited_time',
  'created_by',
  'last_edited_by',
  'archived',
  'url',
] as const

// Read-only properties (cannot be updated)
export const READ_ONLY_PROPERTIES = [
  'id',
  'created_time',
  'last_edited_time',
  'created_by',
  'last_edited_by',
  'url',
  // Formula and rollup properties are also read-only but determined dynamically
] as const

// Property types that support collection operations (add/remove)
export const COLLECTION_PROPERTY_TYPES: PropertyType[] = ['multi_select', 'people', 'relation', 'files'] as const

// Property types that support text operations
export const TEXT_PROPERTY_TYPES: PropertyType[] = ['title', 'rich_text', 'url', 'email', 'phone_number'] as const

// Property types that support numeric operations
export const NUMERIC_PROPERTY_TYPES: PropertyType[] = ['number', 'unique_id'] as const

// Property types that support date operations
export const DATE_PROPERTY_TYPES: PropertyType[] = ['date'] as const

// Error codes
export const ERROR_CODES = {
  // Parsing errors
  SQL_PARSING_ERROR: 'SQL_PARSING_ERROR',
  INVALID_SYNTAX: 'INVALID_SYNTAX',
  UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION',

  // Validation errors
  PROPERTY_VALIDATION_ERROR: 'PROPERTY_VALIDATION_ERROR',
  UNKNOWN_PROPERTY: 'UNKNOWN_PROPERTY',
  TYPE_MISMATCH: 'TYPE_MISMATCH',
  INVALID_VALUE: 'INVALID_VALUE',
  READ_ONLY_PROPERTY: 'READ_ONLY_PROPERTY',

  // Notion API errors
  NOTION_API_ERROR: 'NOTION_API_ERROR',
  DATABASE_NOT_FOUND: 'DATABASE_NOT_FOUND',
  PAGE_NOT_FOUND: 'PAGE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Operation errors
  OPERATION_FAILED: 'OPERATION_FAILED',
  BATCH_OPERATION_FAILED: 'BATCH_OPERATION_FAILED',
  TRANSACTION_ROLLED_BACK: 'TRANSACTION_ROLLED_BACK',
} as const

// Default configuration values
export const DEFAULT_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRIES: 3,
  RATE_LIMIT_DELAY: 100, // milliseconds
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 50,
  MAX_BATCH_SIZE: 10,
  CACHE_TTL: 300000, // 5 minutes
  MAX_CACHE_SIZE: 1000,
} as const

// Response format configuration
export const RESPONSE_FORMAT_DEFAULTS = {
  includeEmptyProperties: false,
  includeSystemProperties: true,
  includeUrls: true,
  dateFormat: 'iso8601' as const,
  simplifyRelations: true,
  maxArrayItems: 100,
} as const

// SQL preprocessing patterns
export const SQL_PREPROCESSING_PATTERNS = {
  // UNDELETE pattern
  UNDELETE: /^\s*UNDELETE\s+FROM\s+(.*?)(?:\s+WHERE\s+(.*))?\s*;?\s*$/i,

  // DELETE pattern
  DELETE: /^\s*DELETE\s+FROM\s+(.*?)(?:\s+WHERE\s+(.*))?\s*;?\s*$/i,

  // DROP pattern (for individual pages)
  DROP: /^\s*DROP\s+(.*?)\s*;?\s*$/i,

  // UNDROP pattern
  UNDROP: /^\s*UNDROP\s+(.*?)\s*;?\s*$/i,

  // DESCRIBE pattern
  DESCRIBE: /^\s*DESCRIBE\s+(.*?)(?:\s+(EXTENDED))?(?:\s+WHERE\s+(.*))?\s*;?\s*$/i,

  // Function replacement patterns
  FUNCTION_REPLACEMENTS: {
    'NEXT_WEEK()': "'__NEXT_WEEK__'",
    'NEXT_MONTH()': "'__NEXT_MONTH__'",
    'NEXT_YEAR()': "'__NEXT_YEAR__'",
    'PAST_WEEK()': "'__PAST_WEEK__'",
    'PAST_MONTH()': "'__PAST_MONTH__'",
    'PAST_YEAR()': "'__PAST_YEAR__'",
    'THIS_WEEK()': "'__THIS_WEEK__'",
    'THIS_MONTH()': "'__THIS_MONTH__'",
    'THIS_YEAR()': "'__THIS_YEAR__'",
    'TODAY()': "'__TODAY__'",
    'NOW()': "'__NOW__'",
    'CURRENT_USER()': "'__CURRENT_USER__'",
  },
} as const

// Rollup function mappings
export const ROLLUP_FUNCTIONS = {
  ROLLUP_ANY: 'any',
  ROLLUP_ALL: 'every',
  ROLLUP_NONE: 'none',
} as const

// Number format mappings
export const NUMBER_FORMATS = {
  number: 'number',
  currency: 'dollar',
  percent: 'percent',
  dollar: 'dollar',
  euro: 'euro',
  pound: 'pound',
  yen: 'yen',
  yuan: 'yuan',
} as const

// Date format mappings
export const DATE_FORMATS = {
  'MM/DD/YYYY': 'MM/DD/YYYY',
  'DD/MM/YYYY': 'DD/MM/YYYY',
  'YYYY-MM-DD': 'YYYY-MM-DD',
  'MMM DD, YYYY': 'MMM DD, YYYY',
  full: 'full',
  relative: 'relative',
} as const

// Color mappings for select/multi-select options
export const NOTION_COLORS = [
  'default',
  'gray',
  'brown',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'red',
] as const

// Type assertion helper
export function isValidPropertyType(type: string): type is PropertyType {
  return Object.values(SQL_TO_NOTION_TYPE_MAP).includes(type as PropertyType)
}

// Type guard for collection property types
export function isCollectionPropertyType(type: PropertyType): boolean {
  return COLLECTION_PROPERTY_TYPES.includes(type)
}

// Type guard for text property types
export function isTextPropertyType(type: PropertyType): boolean {
  return TEXT_PROPERTY_TYPES.includes(type)
}

// Type guard for numeric property types
export function isNumericPropertyType(type: PropertyType): boolean {
  return NUMERIC_PROPERTY_TYPES.includes(type)
}

// Type guard for date property types
export function isDatePropertyType(type: PropertyType): boolean {
  return DATE_PROPERTY_TYPES.includes(type)
}

// Type guard for system properties
export function isSystemProperty(property: string): boolean {
  return SYSTEM_PROPERTIES.includes(property as (typeof SYSTEM_PROPERTIES)[number])
}

// Type guard for read-only properties
export function isReadOnlyProperty(property: string): boolean {
  return READ_ONLY_PROPERTIES.includes(property as (typeof READ_ONLY_PROPERTIES)[number])
}
