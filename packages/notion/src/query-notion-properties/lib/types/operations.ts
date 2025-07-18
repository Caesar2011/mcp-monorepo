/**
 * Operation-specific type definitions for SQL operations
 * Covers SELECT, INSERT, UPDATE, DELETE, UNDELETE, and DESCRIBE
 */

import type { SimplifiedPage, SimplifiedPropertyValue } from './index.js'
import type { NotionFilter, NotionSort, PropertyTypeMapping } from './notion.js'

// Base operation interface
export interface BaseOperation {
  type: OperationType
  database_id?: string
  page_id?: string
  sql: string
  timestamp: string
}

export type OperationType = 'select' | 'insert' | 'update' | 'delete' | 'undelete' | 'describe'

// SELECT operation types
export interface SelectOperation extends BaseOperation {
  type: 'select'
  database_id: string
  columns: string[] | '*'
  filter?: NotionFilter
  sorts?: NotionSort[]
  limit?: number
  start_cursor?: string
  filter_properties?: string[]
}

export interface SelectResult {
  success: true
  operation: 'select'
  database_id: string
  count: number
  results: SimplifiedPage[]
  pagination: {
    has_more: boolean
    next_cursor: string | undefined
  }
  execution_time_ms: number
  timestamp: string
}

// INSERT operation types
export interface InsertOperation extends BaseOperation {
  type: 'insert'
  database_id: string
  columns: string[]
  values: InsertValues[]
  parent_type: 'database_id' | 'page_id' | 'workspace'
}

export type InsertValues = Record<string, SimplifiedPropertyValue>

export interface InsertResult {
  success: true
  operation: 'insert'
  database_id: string
  inserted_count: number
  results: SimplifiedPage[]
  execution_time_ms: number
  timestamp: string
}

// UPDATE operation types
export interface UpdateOperation extends BaseOperation {
  type: 'update'
  database_id?: string
  page_id?: string
  set_clauses: UpdateSetClause[]
  filter?: NotionFilter
  batch?: boolean
}

export interface UpdateSetClause {
  property: string
  value: SimplifiedPropertyValue
  operation: 'replace' | 'add' | 'remove'
}

export interface UpdateResult {
  success: true
  operation: 'update'
  database_id?: string
  page_id?: string
  updated_count: number
  results: SimplifiedPage[]
  changes: Record<string, SimplifiedPropertyValue>
  execution_time_ms: number
  timestamp: string
}

// DELETE operation types (archive in Notion)
export interface DeleteOperation extends BaseOperation {
  type: 'delete'
  database_id: string
  filter: NotionFilter
  force?: boolean
  archive_mode: true // Always true for Notion (no permanent delete)
}

export interface DeleteResult {
  success: true
  operation: 'delete'
  database_id: string
  archived_count: number
  results: Array<SimplifiedPage & { archived_time: string }>
  execution_time_ms: number
  timestamp: string
}

// UNDELETE operation types (restore in Notion)
export interface UndeleteOperation extends BaseOperation {
  type: 'undelete'
  database_id: string
  filter: NotionFilter
  restore_mode: true
}

export interface UndeleteResult {
  success: true
  operation: 'undelete'
  database_id: string
  restored_count: number
  results: Array<SimplifiedPage & { restored_time: string }>
  execution_time_ms: number
  timestamp: string
}

// DESCRIBE operation types
export interface DescribeOperation extends BaseOperation {
  type: 'describe'
  database_id: string
  extended?: boolean
  filter_columns?: string[]
  show_relationships?: boolean
  show_computed?: boolean
}

export interface DescribeResult {
  success: true
  operation: 'describe'
  database_id: string
  database_info: {
    name: string
    description?: string
    created_time: string
    last_edited_time: string
    icon?: string
    cover_url?: string
    url: string
    is_inline: boolean
    archived: boolean
  }
  columns: ColumnDefinition[]
  meta_fields: MetaFieldDefinition[]
  relationships: RelationshipDefinition[]
  computed_fields: ComputedFieldDefinition[]
  statistics: {
    total_pages: number
    archived_pages: number
    last_modified: string
  }
  execution_time_ms: number
  timestamp: string
}

export interface ColumnDefinition {
  name: string
  type: keyof PropertyTypeMapping
  nullable: boolean
  primary_key?: boolean
  description?: string

  // Type-specific metadata
  max_length?: number
  format?: string
  options?: Array<{ name: string; color: string }>
  min?: number
  max?: number
  default?: SimplifiedPropertyValue
  validation?: string

  // Query capabilities
  queryable: boolean
  sortable: boolean
  filterable: boolean
  updatable: boolean
  system_generated: boolean
}

export interface MetaFieldDefinition {
  name: string
  type: 'unique_id' | 'timestamp' | 'boolean' | 'url' | 'user'
  description: string
  queryable: boolean
  system_generated: boolean
  read_only?: boolean
  updatable?: boolean
  example?: string
  format?: string
}

export interface RelationshipDefinition {
  name: string
  type: 'relation'
  target_database: string
  target_database_name?: string
  target_property?: string
  cardinality: 'one_to_one' | 'one_to_many' | 'many_to_many'
  cascade_delete?: boolean
  bidirectional?: boolean
}

export interface ComputedFieldDefinition {
  name: string
  type: 'formula' | 'rollup'
  result_type: keyof PropertyTypeMapping | 'any'
  expression?: string
  source_relation?: string
  source_property?: string
  aggregation?: string
  queryable: boolean
  dependencies: string[]
}

// Operation result union types
export type OperationResult =
  | SelectResult
  | InsertResult
  | UpdateResult
  | DeleteResult
  | UndeleteResult
  | DescribeResult

export type Operation =
  | SelectOperation
  | InsertOperation
  | UpdateOperation
  | DeleteOperation
  | UndeleteOperation
  | DescribeOperation

// Query execution context
export interface QueryContext {
  user_id?: string
  workspace_id?: string
  integration_id?: string
  permissions: {
    read: boolean
    insert: boolean
    update: boolean
    delete: boolean
  }
  rate_limit?: {
    remaining: number
    reset_time: string
  }
}

// Batch operation types
export interface BatchOperation {
  operations: Operation[]
  transaction?: boolean
  stop_on_error?: boolean
  max_concurrency?: number
}

export interface BatchResult {
  success: boolean
  total_operations: number
  successful_operations: number
  failed_operations: number
  results: OperationResult[]
  errors: Array<{
    operation_index: number
    error: {
      code: string
      message: string
      details?: Record<string, unknown>
    }
  }>
  execution_time_ms: number
  timestamp: string
}

// Performance monitoring types
export interface PerformanceMetrics {
  parsing_time_ms: number
  validation_time_ms: number
  api_calls: number
  api_time_ms: number
  total_time_ms: number
  memory_usage?: {
    heap_used: number
    heap_total: number
  }
  cache_hits?: number
  cache_misses?: number
}

// Caching types
export interface CacheEntry<T = unknown> {
  key: string
  value: T
  created_at: string
  expires_at: string
  access_count: number
  last_accessed: string
}

export interface CacheStats {
  total_entries: number
  hit_rate: number
  memory_usage: number
  oldest_entry: string
  newest_entry: string
}

// Streaming types for large result sets
export interface StreamingResult {
  type: 'streaming'
  operation: OperationType
  database_id: string
  total_estimated?: number
  current_batch: number
  batch_size: number
  has_more: boolean
  next_cursor?: string
}

// Type guards for operation results
export function isSelectResult(result: OperationResult): result is SelectResult {
  return result.operation === 'select'
}

export function isInsertResult(result: OperationResult): result is InsertResult {
  return result.operation === 'insert'
}

export function isUpdateResult(result: OperationResult): result is UpdateResult {
  return result.operation === 'update'
}

export function isDeleteResult(result: OperationResult): result is DeleteResult {
  return result.operation === 'delete'
}

export function isUndeleteResult(result: OperationResult): result is UndeleteResult {
  return result.operation === 'undelete'
}

export function isDescribeResult(result: OperationResult): result is DescribeResult {
  return result.operation === 'describe'
}
