import { DatabaseError, ValidationError } from '../errors.js'
import { DataMapper } from './schema.js'

import type { GroupingMode, QueryFilters, QueryResult } from '../types.js'
import type { Table } from '@lancedb/lancedb'

// Constants for quality retrieval logic
const GROUPING_BOUNDARY_STD_MULTIPLIER = 1.5
const HYBRID_SEARCH_CANDIDATE_MULTIPLIER = 3
const DOT_PRODUCT_MAX_DISTANCE = 2 // Theoretical max for dot product on normalized vectors

export interface RetrieverConfig {
  hybridWeight?: number
  maxDistance?: number
  grouping?: GroupingMode
  ftsEnabled: boolean
}

/**
 * Handles the complex logic of searching and retrieving data from the vector store.
 */
export class Retriever {
  private readonly table: Table
  private readonly config: RetrieverConfig

  constructor(table: Table, config: RetrieverConfig) {
    this.table = table
    this.config = config
  }

  public setFtsEnabled(enabled: boolean): void {
    this.config.ftsEnabled = enabled
  }

  /**
   * Executes a search query, handling hybrid search, filtering, and result processing.
   * @param queryVector - The vector representation of the query.
   * @param queryText - The original text of the query for FTS.
   * @param limit - The maximum number of results to return.
   * @param filters - Optional filters to apply to the search.
   * @returns A promise that resolves to an array of query results.
   */
  public async search(
    queryVector: number[],
    queryText: string,
    limit = 10,
    filters?: QueryFilters,
  ): Promise<QueryResult[]> {
    if (limit < 1 || limit > 50) {
      throw new ValidationError(`Invalid limit: expected 1-50, got ${limit}`)
    }

    try {
      const whereClause = buildWhereClause(filters)
      let rawResults: Record<string, unknown>[]

      const useHybrid = this.config.ftsEnabled && queryText.trim().length > 0 && (this.config.hybridWeight ?? 0.6) > 0
      if (useHybrid) {
        rawResults = await this._performHybridSearch(queryVector, queryText, limit, whereClause)
      } else {
        rawResults = await this._performVectorSearch(queryVector, limit, whereClause)
      }

      let results: QueryResult[] = rawResults.map(DataMapper.toQueryResult)

      results = this._applyDistanceFilter(results)
      results = this._applyGrouping(results)

      return results
    } catch (error) {
      throw new DatabaseError('Failed to search vectors.', error)
    }
  }

  /**
   * Performs a hybrid search by combining FTS and vector search results.
   */
  private async _performHybridSearch(
    queryVector: number[],
    queryText: string,
    limit: number,
    whereClause?: string,
  ): Promise<Record<string, unknown>[]> {
    const candidateLimit = limit * HYBRID_SEARCH_CANDIDATE_MULTIPLIER

    const ftsQuery = this.table.search(queryText, 'fts', 'text').limit(candidateLimit)
    if (whereClause) ftsQuery.where(whereClause)
    const ftsResults = await ftsQuery.toArray()

    const vectorQuery = this.table.vectorSearch(queryVector).distanceType('dot').limit(candidateLimit)
    if (whereClause) vectorQuery.where(whereClause)
    const vectorResults = await vectorQuery.toArray()

    return this._hybridRerank(ftsResults, vectorResults, limit)
  }

  /**
   * Performs a standard vector-only search.
   */
  private async _performVectorSearch(
    queryVector: number[],
    limit: number,
    whereClause?: string,
  ): Promise<Record<string, unknown>[]> {
    const query = this.table.vectorSearch(queryVector).distanceType('dot').limit(limit)
    if (whereClause) query.where(whereClause)
    return query.toArray()
  }

  /**
   * Filters results based on the configured maximum distance.
   */
  private _applyDistanceFilter(results: QueryResult[]): QueryResult[] {
    const maxDistance = this.config.maxDistance
    if (maxDistance !== undefined) {
      return results.filter((r) => r.score <= maxDistance)
    }
    return results
  }

  /**
   * Groups results by relevance gaps to improve quality.
   */
  private _applyGrouping(results: QueryResult[]): QueryResult[] {
    if (!this.config.grouping || results.length <= 1) {
      return results
    }

    const gaps: { index: number; gap: number }[] = []
    for (let i = 0; i < results.length - 1; i++) {
      gaps.push({ index: i + 1, gap: results[i + 1].score - results[i].score })
    }

    const gapValues = gaps.map((g) => g.gap)
    const mean = gapValues.reduce((a, b) => a + b, 0) / gapValues.length
    const std = Math.sqrt(gapValues.map((x) => (x - mean) ** 2).reduce((a, b) => a + b, 0) / gapValues.length)
    const threshold = mean + GROUPING_BOUNDARY_STD_MULTIPLIER * std

    const boundaries = gaps.filter((g) => g.gap > threshold).map((g) => g.index)
    if (boundaries.length === 0) return results

    const groupsToInclude = this.config.grouping === 'similar' ? 1 : 2
    const cutoffIndex = boundaries[groupsToInclude - 1]

    return cutoffIndex !== undefined ? results.slice(0, cutoffIndex) : results
  }

  /**
   * Reranks and merges FTS and vector search results.
   */
  private _hybridRerank(
    ftsResults: Record<string, unknown>[],
    vectorResults: Record<string, unknown>[],
    limit: number,
  ): Record<string, unknown>[] {
    const scoreMap = new Map<string, { result: Record<string, unknown>; score: number }>()
    const bm25Weight = this.config.hybridWeight ?? 0.6
    const vectorWeight = 1.0 - bm25Weight

    for (const result of vectorResults) {
      const key = `${result['filePath']}:${result['chunkIndex']}`
      const distance = (result['_distance'] as number) ?? DOT_PRODUCT_MAX_DISTANCE
      const vectorScore = Math.max(0, 1 - distance / DOT_PRODUCT_MAX_DISTANCE)
      scoreMap.set(key, { result, score: vectorScore * vectorWeight })
    }

    for (let i = 0; i < ftsResults.length; i++) {
      const result = ftsResults[i]
      const key = `${result['filePath']}:${result['chunkIndex']}`
      const ftsScore = 1 - i / (ftsResults.length || 1)
      const entry = scoreMap.get(key)
      if (entry) {
        entry.score += ftsScore * bm25Weight
      } else {
        scoreMap.set(key, { result, score: ftsScore * bm25Weight })
      }
    }

    return Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({ ...item.result, _distance: 1 - item.score }))
  }
}

/**
 * Constructs a SQL WHERE clause from the filter object.
 */
export function buildWhereClause(filters?: QueryFilters): string | undefined {
  if (!filters) return undefined
  const conditions: string[] = []

  if (filters.type) conditions.push(`metadata.memoryType = '${filters.type}'`)
  if (filters.project) conditions.push(`metadata.project = '${filters.project.replace(/'/g, "''")}'`)
  if (filters.fileName) conditions.push(`metadata.fileName = '${filters.fileName.replace(/'/g, "''")}'`)
  if (filters.tags && filters.tags.length > 0) {
    const tagsList = `[${filters.tags.map((t) => `'${t.replace(/'/g, "''")}'`).join(', ')}]`
    conditions.push(`array_has_all(metadata.tags, ${tagsList})`)
  }

  return conditions.length > 0 ? conditions.join(' AND ') : undefined
}
