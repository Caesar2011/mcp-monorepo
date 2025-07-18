/**
 * Output formatting for open-page tool
 */
import type { ConfluencePageResponse } from './types.js'

export function formatOpenPageResponse(status: number, data?: ConfluencePageResponse): string {
  if (!data) return `HTTP ${status} (no response body)`
  return `HTTP ${status}\n${JSON.stringify(data)}`
}

export function formatOpenPageError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `Error opening page: ${message}`
}
