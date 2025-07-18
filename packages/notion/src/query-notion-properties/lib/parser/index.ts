/**
 * Main SQL parser for Notion SQL queries
 * Combines preprocessing, standard SQL parsing, and AST conversion
 */

import { Parser as SQLParser } from 'node-sql-parser'

import { preprocessSQL, validatePreprocessedSQL } from './preprocessor.js'
import { convertToNotionAST } from '../types/index.js'
import { SQLParsingError, NotionSQLBaseError } from '../utils/error-handling.js'

import type {
  NotionSQLConfig,
  NotionSQLAST,
  SQLStatementType,
  PreprocessResult,
  ValidationResult,
  NotionFunction,
} from '../types/index.js'
import type { AST } from 'node-sql-parser'

/**
 * Main Notion SQL Parser class
 * Handles preprocessing, parsing, and validation of SQL queries
 */
export class NotionSQLParser {
  private sqlParser: SQLParser
  private config: NotionSQLConfig

  constructor(config: NotionSQLConfig) {
    this.config = config
    this.sqlParser = new SQLParser()
  }

  /**
   * Parse SQL query into Notion-compatible AST
   */
  async parseSQL(sql: string): Promise<NotionSQLAST> {
    try {
      // Step 1: Preprocess custom SQL extensions
      const preprocessResult = preprocessSQL(sql)

      if (this.config.debug) {
        console.log('Preprocessed SQL:', preprocessResult.sql)
        console.log('Transformations:', preprocessResult.transformations)
      }

      // Step 2: Validate preprocessed SQL
      const validation = validatePreprocessedSQL(preprocessResult.sql)
      if (!validation.valid) {
        throw new SQLParsingError(`Preprocessing validation failed: ${validation.errors.join(', ')}`, sql)
      }

      // Step 3: Parse with node-sql-parser
      const standardAST = this.sqlParser.astify(preprocessResult.sql)

      // Step 4: Convert to Notion-specific AST using the helper from ast.ts
      let baseAST
      if (Array.isArray(standardAST)) {
        if (standardAST.length === 0) {
          throw new SQLParsingError('Empty SQL statement')
        }
        baseAST = standardAST[0]
      } else {
        baseAST = standardAST
      }

      // Convert using the shared helper
      const notionAST = convertToNotionAST(baseAST)

      // Add preprocessing context
      if (preprocessResult.transformations.length > 0) {
        notionAST._preprocessing = {
          transformations: preprocessResult.transformations,
          customFunctions: preprocessResult.customFunctions,
        }
      }

      // Determine final statement type based on preprocessing
      notionAST.type = this.getStatementType(baseAST, preprocessResult)

      // Add custom flags
      notionAST.extended = this.isExtendedOperation(preprocessResult)
      notionAST.force = this.hasForceFlag(preprocessResult)

      // Step 5: Validate the final AST
      this.validateNotionAST(notionAST, sql)

      return notionAST
    } catch (error) {
      if (error instanceof NotionSQLBaseError) {
        throw error
      }

      // Handle node-sql-parser errors
      if (error instanceof Error) {
        throw new SQLParsingError(
          `SQL parsing failed: ${error.message}`,
          sql,
          'Check SQL syntax and ensure all identifiers are properly quoted',
        )
      }

      throw new SQLParsingError('Unknown parsing error', sql)
    }
  }

  /**
   * Determine the SQL statement type (with preprocessing overrides)
   */
  private getStatementType(ast: AST, preprocessResult: PreprocessResult): SQLStatementType {
    // Check for preprocessing transformations first
    for (const transformation of preprocessResult.transformations) {
      switch (transformation.type) {
        case 'undelete_to_update':
          return 'undelete'
        case 'delete_to_archive':
          return transformation.original.toUpperCase().includes('DROP') ? 'drop' : 'delete'
      }
    }

    // Check for special DESCRIBE operations
    if (ast.type === 'select' && ast.columns && ast.columns.length > 0) {
      const firstColumn = ast.columns[0]
      if (typeof firstColumn === 'object' && firstColumn.expr && typeof firstColumn.expr.value === 'string') {
        if (firstColumn.expr.value.includes('__DESCRIBE__')) {
          return 'describe'
        }
      }
    }

    // Standard SQL operations from node-sql-parser
    switch (ast.type?.toLowerCase()) {
      case 'select':
        return 'select'
      case 'insert':
      case 'replace':
        return 'insert'
      case 'update':
        return 'update'
      case 'delete':
        return 'delete'
      default:
        throw new SQLParsingError(`Unsupported SQL operation: ${ast.type}`)
    }
  }

  /**
   * Check if operation has EXTENDED flag
   */
  private isExtendedOperation(preprocessResult: PreprocessResult): boolean {
    return preprocessResult.transformations.some((t) => t.transformed.includes('__DESCRIBE_EXTENDED__'))
  }

  /**
   * Check if operation has FORCE flag
   */
  private hasForceFlag(preprocessResult: PreprocessResult): boolean {
    return preprocessResult.transformations.some((t) => t.original.toUpperCase().includes('FORCE'))
  }

  /**
   * Validate the final Notion AST
   */
  private validateNotionAST(ast: NotionSQLAST, originalSQL: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate required fields based on operation type
    switch (ast.type) {
      case 'select':
      case 'describe':
        if (!ast.table) {
          errors.push('SELECT/DESCRIBE operations require a table/database reference')
        }
        break

      case 'insert':
        if (!ast.table) {
          errors.push('INSERT operations require a table/database reference')
        }
        if (!ast.values || ast.values.length === 0) {
          errors.push('INSERT operations require VALUES clause')
        }
        break

      case 'update':
      case 'delete':
      case 'undelete':
        if (!ast.table) {
          errors.push(`${ast.type.toUpperCase()} operations require a table/database reference`)
        }
        if (ast.type === 'update' && (!ast.set || ast.set.length === 0)) {
          errors.push('UPDATE operations require SET clause')
        }
        break
    }

    // Validate database ID format if present
    if (ast.table) {
      const dbId = ast.table.replace(/^"|"$/g, '')
      if (dbId !== 'WORKSPACE' && !this.isValidUUID(dbId)) {
        warnings.push(`Database ID '${dbId}' may not be a valid UUID`)
      }
    }

    if (errors.length > 0) {
      throw new SQLParsingError(`AST validation failed: ${errors.join(', ')}`, originalSQL)
    }

    return {
      valid: true,
      errors,
      warnings,
    }
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid) || uuidRegex.test(uuid.replace(/-/g, ''))
  }

  /**
   * Get parser configuration
   */
  getConfig(): NotionSQLConfig {
    return { ...this.config }
  }

  /**
   * Update parser configuration
   */
  updateConfig(config: Partial<NotionSQLConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Parse multiple SQL statements
   */
  async parseMultipleSQL(sqlStatements: string[]): Promise<NotionSQLAST[]> {
    const results: NotionSQLAST[] = []

    for (const sql of sqlStatements) {
      try {
        const ast = await this.parseSQL(sql)
        results.push(ast)
      } catch (error) {
        if (this.config.debug) {
          console.error(`Failed to parse SQL: ${sql}`, error)
        }
        throw error
      }
    }

    return results
  }

  /**
   * Get supported operations
   */
  getSupportedOperations(): SQLStatementType[] {
    return ['select', 'insert', 'update', 'delete', 'undelete', 'describe', 'drop', 'undrop']
  }

  /**
   * Check if operation is supported
   */
  isOperationSupported(operation: string): boolean {
    return this.getSupportedOperations().includes(operation as SQLStatementType)
  }

  /**
   * Get custom functions from preprocessing
   */
  extractCustomFunctions(sql: string): NotionFunction[] {
    try {
      const preprocessResult = preprocessSQL(sql)
      return preprocessResult.customFunctions
    } catch {
      return []
    }
  }

  /**
   * Validate SQL syntax without full parsing
   */
  validateSQL(sql: string): ValidationResult {
    try {
      // Basic validation
      if (!sql || sql.trim() === '') {
        return {
          valid: false,
          errors: ['SQL query cannot be empty'],
          warnings: [],
        }
      }

      // Try preprocessing
      const preprocessResult = preprocessSQL(sql)
      const preprocessValidation = validatePreprocessedSQL(preprocessResult.sql)

      if (!preprocessValidation.valid) {
        return {
          valid: false,
          errors: preprocessValidation.errors,
          warnings: [],
        }
      }

      // Try basic parsing without full conversion
      try {
        this.sqlParser.astify(preprocessResult.sql)
      } catch (error) {
        return {
          valid: false,
          errors: [`SQL syntax error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          warnings: [],
        }
      }

      return {
        valid: true,
        errors: [],
        warnings: [],
      }
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        warnings: [],
      }
    }
  }
}

/**
 * Create a new NotionSQLParser instance
 */
export function createNotionSQLParser(config: NotionSQLConfig): NotionSQLParser {
  return new NotionSQLParser(config)
}

/**
 * Parse a single SQL statement (convenience function)
 */
export async function parseNotionSQL(sql: string, config: NotionSQLConfig): Promise<NotionSQLAST> {
  const parser = new NotionSQLParser(config)
  return parser.parseSQL(sql)
}

/**
 * Validate SQL syntax (convenience function)
 */
export function validateNotionSQL(sql: string, config: NotionSQLConfig): ValidationResult {
  const parser = new NotionSQLParser(config)
  return parser.validateSQL(sql)
}
