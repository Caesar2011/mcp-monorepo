/**
 * Output formatting for list-space-pages tool
 */
import type { ConfluenceListPagesResponse } from './types.js'

export function formatListSpacePagesResponse(status: number, data?: ConfluenceListPagesResponse): string {
  if (!data) return `HTTP ${status} (no response body)`
  return `HTTP ${status}\n${JSON.stringify(data)}`
}

export function formatListSpacePagesError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `Error listing pages in space: ${message}`
}
