/**
 * AST (Abstract Syntax Tree) type definitions for SQL parsing
 * Based on node-sql-parser output with Notion-specific extensions
 */

import { SQLParsingError } from '../utils/error-handling.js'

import type { AST, Select, Insert_Replace, Update, Delete } from 'node-sql-parser'

// Base interface that matches node-sql-parser structure
export interface NotionSQLAST {
  // Core AST properties from node-sql-parser
  type: SQLStatementType

  // Common properties across statement types
  table?: string // Table/database reference
  columns?: string[] | '*' // For SELECT
  where?: WhereClause // WHERE conditions
  orderby?: OrderByClause[] // ORDER BY clauses
  limit?: LimitClause // LIMIT clause
  values?: ValueClause[][] // For INSERT VALUES
  set?: SetClause[] // For UPDATE SET
  from?: unknown[] // FROM clause (from node-sql-parser)

  // Notion-specific extensions
  extended?: boolean // For DESCRIBE EXTENDED
  force?: boolean // For DELETE ... FORCE
  sql?: string // Original SQL for debugging

  // Preprocessing context
  _preprocessing?: {
    transformations: Transformation[]
    customFunctions: NotionFunction[]
  }
}

export type SQLStatementType =
  | 'select'
  | 'insert'
  | 'update'
  | 'delete'
  | 'undelete' // Custom extension
  | 'describe' // Custom extension
  | 'drop' // For individual pages
  | 'undrop' // Custom extension

// WHERE clause structures that match node-sql-parser Binary type
export interface WhereClause {
  type: 'binary_expr' | 'unary_expr' | 'function' | 'column_ref'
  operator?: ComparisonOperator | LogicalOperator
  left?: WhereClause | ColumnRef | ValueRef
  right?: WhereClause | ColumnRef | ValueRef
  expr?: WhereClause // For unary expressions
  parentheses?: boolean // From node-sql-parser
}

// Column reference matching node-sql-parser ColumnRef
export interface ColumnRef {
  type: 'column_ref'
  table?: string | null
  column: string
  options?: unknown // From node-sql-parser
}

// Value reference matching node-sql-parser ValueExpr
export interface ValueRef {
  type: 'string' | 'number' | 'boolean' | 'sql_null' | 'array' | 'function'
  value: unknown
}

// Comparison operators (standard + Notion-specific)
export type ComparisonOperator =
  | '='
  | '!='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | 'LIKE'
  | 'NOT LIKE'
  | 'ILIKE'
  | 'IN'
  | 'NOT IN'
  | 'BETWEEN'
  | 'NOT BETWEEN'
  | 'IS'
  | 'IS NOT'
  | 'CONTAINS'
  | 'NOT CONTAINS' // Notion-specific
  | 'CONTAINS_ALL'
  | 'CONTAINS_ANY' // Notion-specific
  | 'STARTS_WITH'
  | 'ENDS_WITH' // Notion-specific
  | 'IS_EMPTY'
  | 'IS_NOT_EMPTY' // Notion-specific
  | 'ROLLUP_ANY'
  | 'ROLLUP_ALL'
  | 'ROLLUP_NONE' // Notion-specific

export type LogicalOperator = 'AND' | 'OR' | 'NOT'

// ORDER BY clause matching node-sql-parser OrderBy
export interface OrderByClause {
  expr: ColumnRef | ValueRef // Expression to order by
  type: 'ASC' | 'DESC' // Order direction
}

// LIMIT clause matching node-sql-parser Limit
export interface LimitClause {
  separator?: string
  value: number[] // Array to support LIMIT x OFFSET y
}

// SET clause for UPDATE matching node-sql-parser SetList
export interface SetClause {
  column: string
  value: unknown
  table?: string | null
  operation?: 'replace' | 'add' | 'remove' // For collection operations
}

// VALUES clause for INSERT
export type ValueClause = unknown[]

// Notion-specific function calls in SQL
export interface NotionFunction {
  type: 'function'
  name: NotionFunctionName
  args?: unknown[]
}

export type NotionFunctionName =
  // Date functions
  | 'NEXT_WEEK'
  | 'NEXT_MONTH'
  | 'NEXT_YEAR'
  | 'PAST_WEEK'
  | 'PAST_MONTH'
  | 'PAST_YEAR'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'THIS_YEAR'
  | 'TODAY'
  | 'NOW'
  // User functions
  | 'CURRENT_USER'
  // Rollup functions
  | 'ROLLUP_ANY'
  | 'ROLLUP_ALL'
  | 'ROLLUP_NONE'
  // Utility functions
  | 'LENGTH'
  | 'UPPER'
  | 'LOWER'
  | 'YEAR'
  | 'MONTH'
  | 'DAY'
  | 'WEEKDAY'
  | 'DATE_ADD'
  | 'DATE_SUB'

// Preprocessor transformation types
export interface PreprocessResult {
  sql: string
  transformations: Transformation[]
  customFunctions: NotionFunction[]
}

export interface Transformation {
  type: 'undelete_to_update' | 'delete_to_archive' | 'function_replacement'
  original: string
  transformed: string
  position: { start: number; end: number }
}

// Validation result types - using string arrays for simplicity
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// Type guards for node-sql-parser AST types
export function isSelectAST(ast: AST): ast is Select {
  return ast.type === 'select'
}

export function isInsertAST(ast: AST): ast is Insert_Replace {
  return ast.type === 'insert' || ast.type === 'replace'
}

export function isUpdateAST(ast: AST): ast is Update {
  return ast.type === 'update'
}

export function isDeleteAST(ast: AST): ast is Delete {
  return ast.type === 'delete'
}

// Helper to convert node-sql-parser AST to our NotionSQLAST
export function convertToNotionAST(sqlAST: AST): NotionSQLAST {
  const base: NotionSQLAST = {
    type: sqlAST.type as SQLStatementType,
  }

  // Copy common properties based on AST type
  if (isSelectAST(sqlAST)) {
    const from = sqlAST.from
    if (!Array.isArray(from) || !from[0] || !('table' in from[0]) || !from[0].table) {
      throw new SQLParsingError('SELECT requires FROM clause with database/table reference')
    }
    base.columns = sqlAST.columns ? (sqlAST.columns as unknown as string[]) : undefined
    base.table = from[0].table
    base.where = sqlAST.where as unknown as WhereClause
    base.orderby = sqlAST.orderby as unknown as OrderByClause[]
    base.limit = sqlAST.limit as unknown as LimitClause
  } else if (isInsertAST(sqlAST)) {
    base.table = sqlAST.table as unknown as string
    base.columns = sqlAST.columns || undefined
    base.values = sqlAST.values as unknown as ValueClause[][]
  } else if (isUpdateAST(sqlAST)) {
    base.table = sqlAST.table ? (sqlAST.table[0] as unknown as string) : undefined
    base.set = sqlAST.set as unknown as SetClause[]
    base.where = sqlAST.where as unknown as WhereClause
  } else if (isDeleteAST(sqlAST)) {
    base.table = sqlAST.table as unknown as string
    base.where = sqlAST.where as unknown as WhereClause
  }

  return base
}
