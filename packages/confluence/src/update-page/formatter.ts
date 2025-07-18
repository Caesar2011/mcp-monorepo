/**
 * Output formatting for update-page tool
 */
import type { ConfluenceUpdatePageResponse } from './types.js'

export function formatUpdatePageResponse(status: number, data?: ConfluenceUpdatePageResponse): string {
  if (!data) return `HTTP ${status} (no response body)`
  return `HTTP ${status}\n${JSON.stringify(data)}`
}

export function formatUpdatePageError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `Error updating page: ${message}`
}
