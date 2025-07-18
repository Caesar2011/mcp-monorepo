// Types for search-cql tool

export interface SearchCqlParams {
  cqlQuery: string
  limit?: number
  start?: number
}

export interface ConfluenceSearchResponse {
  results: unknown[]
  start: number
  limit: number
  size: number
  total?: number
  [key: string]: unknown
}
