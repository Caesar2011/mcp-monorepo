/**
 * Output formatting for list-spaces tool
 */
import type { ConfluenceSpacesResponse } from './types.js'

export function formatListSpacesResponse(status: number, data?: ConfluenceSpacesResponse): string {
  if (!data) return `HTTP ${status} (no response body)`
  return `HTTP ${status}\n${JSON.stringify(data)}`
}

export function formatListSpacesError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `Error listing spaces: ${message}`
}
