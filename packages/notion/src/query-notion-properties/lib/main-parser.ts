/**
 * Complete NotionSQLParser class - integrates all phases
 * Provides end-to-end SQL query execution for Notion databases
 */

import { validateAllFunctions } from './functions/index.js'
import { executeDeleteOperation, executeUndeleteOperation } from './operations/delete.js'
import { executeDescribeOperation } from './operations/describe.js'
import { executeInsertOperation } from './operations/insert.js'
import { executeSelectOperation } from './operations/select.js'
import { executeUpdateOperation } from './operations/update.js'
import { NotionSQLParser as BaseParser } from './parser/index.js'
import { formatError, createDetailedError } from './utils/error-handling.js'

import type { UserContext } from './functions/index.js'
import type { NotionSQLAST } from './types/ast.js'
import type {
  NotionSQLConfig,
  SQLResponse,
  SQLOperation,
  SelectResult,
  InsertResult,
  UpdateResult,
  DeleteResult,
  UndeleteResult,
  DescribeResult,
  ResponseFormatConfig,
  SimplifiedPage,
} from './types/index.js'

/**
 * Main NotionSQL query executor
 * Integrates parsing, conversion, and execution phases
 */
export class NotionSQLParser {
  private baseParser: BaseParser
  private config: NotionSQLConfig
  private userContext?: UserContext

  constructor(config: NotionSQLConfig) {
    this.config = config
    this.baseParser = new BaseParser(config)
    this.setupUserContext()
  }

  /**
   * Execute SQL query end-to-end
   * Main public API method
   */
  async query<T = SimplifiedPage>(
    sql: string,
    options?: {
      responseFormat?: ResponseFormatConfig
      timeout?: number
      validateOnly?: boolean
    },
  ): Promise<SQLResponse<T>> {
    const startTime = Date.now()

    try {
      // Step 1: Validate SQL syntax
      const validation = this.baseParser.validateSQL(sql)
      if (!validation.valid) {
        return {
          success: false,
          operation: 'select',
          error: {
            code: 'SQL_VALIDATION_ERROR',
            message: `SQL validation failed: ${validation.errors.join(', ')}`,
            details: { errors: validation.errors, warnings: validation.warnings },
            sql,
            suggestion: 'Check SQL syntax and property names',
          },
        }
      }

      // Return early if validation-only mode
      if (options?.validateOnly) {
        return {
          success: true,
          operation: 'select',
          results: [] as T[],
          count: 0,
          execution_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        }
      }

      // Step 2: Validate custom functions
      const functionValidation = validateAllFunctions(sql, {
        userContext: this.userContext,
      })

      if (!functionValidation.valid) {
        return {
          success: false,
          operation: 'select',
          error: {
            code: 'FUNCTION_VALIDATION_ERROR',
            message: `Function validation failed: ${functionValidation.errors.join(', ')}`,
            details: {
              errors: functionValidation.errors,
              warnings: functionValidation.warnings,
            },
            sql,
            suggestion: 'Check function syntax and arguments',
          },
        }
      }

      // Step 3: Parse SQL to AST
      const ast = await this.baseParser.parseSQL(sql)
      ast.sql = sql // Store original SQL

      // Step 4: Set timeout if specified
      const executionTimeout = options?.timeout || this.config.timeout || 30000
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Query timeout after ${executionTimeout}ms`))
        }, executionTimeout)
      })

      // Step 5: Execute operation based on type
      const operationPromise = this.executeOperation(ast, options?.responseFormat)

      const result = await Promise.race([operationPromise, timeoutPromise])

      // Add execution timing
      result.execution_time_ms = Date.now() - startTime
      result.timestamp = new Date().toISOString()

      return result as SQLResponse<T>
    } catch (error) {
      // Handle all errors with detailed context
      const operation = this.extractOperationFromSQL(sql)

      return createDetailedError(error, {
        operation,
        sql,
        databaseId: this.extractDatabaseIdFromSQL(sql),
        additionalInfo: {
          execution_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          config: {
            debug: this.config.debug,
            timeout: this.config.timeout,
          },
        },
      }) as SQLResponse<T>
    }
  }

  /**
   * Execute operation based on AST type
   */
  private async executeOperation(
    ast: NotionSQLAST,
    responseFormat?: ResponseFormatConfig,
  ): Promise<SelectResult | InsertResult | UpdateResult | DeleteResult | UndeleteResult | DescribeResult> {
    const context = {
      userContext: this.userContext,
      config: this.config,
    }

    switch (ast.type) {
      case 'select':
        return executeSelectOperation(ast, this.config.client, context, responseFormat)

      case 'insert':
        return executeInsertOperation(ast, this.config.client, context, responseFormat)

      case 'update':
        return executeUpdateOperation(ast, this.config.client, context, responseFormat)

      case 'delete':
        return executeDeleteOperation(ast, this.config.client, context, responseFormat)

      case 'undelete':
        return executeUndeleteOperation(ast, this.config.client, context, responseFormat)

      case 'describe':
        return executeDescribeOperation(ast, this.config.client, context)

      default:
        throw new Error(`Unsupported operation: ${ast.type}`)
    }
  }

  /**
   * Batch execute multiple SQL queries
   */
  async batchQuery<T = SimplifiedPage>(
    queries: string[],
    options?: {
      responseFormat?: ResponseFormatConfig
      continueOnError?: boolean
      maxConcurrency?: number
    },
  ): Promise<Array<SQLResponse<T>>> {
    const maxConcurrency = options?.maxConcurrency || 3
    const results: Array<SQLResponse<T>> = []

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < queries.length; i += maxConcurrency) {
      const batch = queries.slice(i, i + maxConcurrency)

      const batchPromises = batch.map(async (sql) => {
        try {
          return await this.query<T>(sql, options)
        } catch (error) {
          if (options?.continueOnError) {
            return formatError(error, 'batch_query', sql) as SQLResponse<T>
          }
          throw error
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Rate limiting delay between batches
      if (i + maxConcurrency < queries.length) {
        await new Promise((resolve) => setTimeout(resolve, this.config.rateLimitDelay || 100))
      }
    }

    return results
  }

  /**
   * Transaction-like batch execution (all or nothing)
   */
  async transaction<T = SimplifiedPage>(
    queries: string[],
    options?: {
      responseFormat?: ResponseFormatConfig
    },
  ): Promise<{
    success: boolean
    results: Array<SQLResponse<T>>
    rollbackInfo?: string
  }> {
    const results: Array<SQLResponse<T>> = []

    try {
      // Execute all queries
      for (const sql of queries) {
        const result = await this.query<T>(sql, options)
        results.push(result)

        // Stop on first error
        if (!result.success) {
          return {
            success: false,
            results,
            rollbackInfo: `Transaction failed at query ${results.length}: ${result.error.message}`,
          }
        }
      }

      return {
        success: true,
        results,
      }
    } catch (error) {
      const errorResult = formatError(error, 'transaction') as SQLResponse<T>
      results.push(errorResult)

      return {
        success: false,
        results,
        rollbackInfo: `Transaction failed with error: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Validate SQL without executing
   */
  validateSQL(sql: string): {
    valid: boolean
    errors: string[]
    warnings: string[]
    ast?: NotionSQLAST
  } {
    try {
      const baseValidation = this.baseParser.validateSQL(sql)

      if (!baseValidation.valid) {
        return baseValidation
      }

      // Additional function validation
      const functionValidation = validateAllFunctions(sql, {
        userContext: this.userContext,
      })

      // Try to parse AST
      let ast: NotionSQLAST | undefined
      try {
        // Don't await since we're just validating
        this.baseParser.parseSQL(sql).then((parsed) => {
          ast = parsed
        })
      } catch {
        // AST parsing failed, but base validation passed
        // This might happen with complex custom functions
      }

      return {
        valid: baseValidation.valid && functionValidation.valid,
        errors: [...baseValidation.errors, ...functionValidation.errors],
        warnings: [...baseValidation.warnings, ...functionValidation.warnings],
        ast,
      }
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
      }
    }
  }

  /**
   * Get database schema
   */
  async describe(databaseId: string, extended = false): Promise<DescribeResult> {
    const sql = `DESCRIBE "${databaseId}"${extended ? ' EXTENDED' : ''}`
    const result = await this.query(sql)

    if (!result.success) {
      throw new Error(`Failed to describe database: ${result.error.message}`)
    }

    return result as DescribeResult
  }

  /**
   * Quick query helpers
   */
  async select<T = SimplifiedPage>(
    databaseId: string,
    options?: {
      columns?: string[]
      where?: Record<string, unknown>
      orderBy?: Array<{ column: string; direction: 'ASC' | 'DESC' }>
      limit?: number
    },
  ): Promise<SelectResult> {
    let sql = `SELECT ${options?.columns?.join(', ') || '*'} FROM "${databaseId}"`

    if (options?.where) {
      const conditions = Object.entries(options.where)
        .map(([key, value]) => {
          if (typeof value === 'string') {
            return `${key} = '${value}'`
          }
          return `${key} = ${value}`
        })
        .join(' AND ')
      sql += ` WHERE ${conditions}`
    }

    if (options?.orderBy) {
      const sorts = options.orderBy.map((sort) => `${sort.column} ${sort.direction}`).join(', ')
      sql += ` ORDER BY ${sorts}`
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
    }

    const result = await this.query<T>(sql)
    if (!result.success) {
      throw new Error(`SELECT failed: ${result.error.message}`)
    }

    return result as SelectResult
  }

  /**
   * Configuration management
   */
  getConfig(): NotionSQLConfig {
    return { ...this.config }
  }

  updateConfig(config: Partial<NotionSQLConfig>): void {
    this.config = { ...this.config, ...config }
    this.baseParser.updateConfig(config)
  }

  setUserContext(userContext: UserContext): void {
    this.userContext = userContext
  }

  getUserContext(): UserContext | undefined {
    return this.userContext
  }

  /**
   * Get query statistics and performance info
   */
  async getQueryStats(sql: string): Promise<{
    complexity: 'low' | 'medium' | 'high'
    estimatedExecutionTime: number
    warnings: string[]
    suggestions: string[]
  }> {
    const validation = this.validateSQL(sql)

    let complexity: 'low' | 'medium' | 'high' = 'low'
    let estimatedTime = 100 // Base time in ms
    const warnings: string[] = [...validation.warnings]
    const suggestions: string[] = []

    // Analyze SQL complexity
    const hasJoins = sql.toUpperCase().includes('ROLLUP_')
    const hasComplexWhere = (sql.match(/WHERE/gi) || []).length > 0 && sql.length > 200
    const hasTextSearch = /LIKE|CONTAINS/i.test(sql)

    if (hasJoins) {
      complexity = 'medium'
      estimatedTime += 500
      warnings.push('Rollup functions may impact performance')
      suggestions.push('Consider using cached computed properties for complex rollups')
    }

    if (hasComplexWhere) {
      if (complexity === 'low') complexity = 'medium'
      estimatedTime += 200
    }

    if (hasTextSearch) {
      complexity = 'high'
      estimatedTime += 1000
      warnings.push('Text search operations can be slow on large datasets')
      suggestions.push('Use property-based filters when possible')
    }

    return {
      complexity,
      estimatedExecutionTime: estimatedTime,
      warnings,
      suggestions,
    }
  }

  // Private helper methods
  private setupUserContext(): void {
    // In a real implementation, this would extract user info from the Notion client
    // For now, we set up basic context
    this.userContext = {
      // These would be populated from the Notion client or auth context
      userId: undefined,
      email: undefined,
      name: undefined,
      workspaceId: undefined,
    }
  }

  private extractOperationFromSQL(sql: string): SQLOperation {
    const trimmed = sql.trim().toUpperCase()

    if (trimmed.startsWith('SELECT')) return 'select'
    if (trimmed.startsWith('INSERT')) return 'insert'
    if (trimmed.startsWith('UPDATE')) return 'update'
    if (trimmed.startsWith('DELETE')) return 'delete'
    if (trimmed.startsWith('UNDELETE')) return 'undelete'
    if (trimmed.startsWith('DESCRIBE')) return 'describe'

    return 'select' // Default
  }

  private extractDatabaseIdFromSQL(sql: string): string | undefined {
    // Simple regex to extract database ID from common patterns
    const patterns = [
      /FROM\s+["']([^"']+)["']/i,
      /INTO\s+["']([^"']+)["']/i,
      /UPDATE\s+["']([^"']+)["']/i,
      /DESCRIBE\s+["']([^"']+)["']/i,
    ]

    for (const pattern of patterns) {
      const match = sql.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return undefined
  }
}

/**
 * Create a NotionSQLParser instance with validation
 */
export function createNotionSQLParser(config: NotionSQLConfig): NotionSQLParser {
  if (!config.client) {
    throw new Error('NotionSQLConfig.client is required. Please provide a @notionhq/client instance.')
  }

  return new NotionSQLParser(config)
}

/**
 * Quick query execution (convenience function)
 */
export async function executeNotionSQL<T = SimplifiedPage>(
  sql: string,
  config: NotionSQLConfig,
  options?: { responseFormat?: ResponseFormatConfig },
): Promise<SQLResponse<T>> {
  const parser = new NotionSQLParser(config)
  return parser.query<T>(sql, options)
}
