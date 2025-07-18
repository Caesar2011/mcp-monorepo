/**
 * Output formatting for search-cql tool
 */
import type { ConfluenceSearchResponse } from './types.js'

export function formatSearchCqlResponse(status: number, data?: ConfluenceSearchResponse): string {
  if (!data) return `HTTP ${status} (no response body)`
  return `HTTP ${status}\n${JSON.stringify(data)}`
}

export function formatSearchCqlError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `Error searching CQL: ${message}`
}
