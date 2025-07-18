/**
 * Output formatting for create-page tool
 */
import type { ConfluenceCreatePageResponse } from './types.js'

export function formatCreatePageResponse(status: number, data?: ConfluenceCreatePageResponse): string {
  if (!data) return `HTTP ${status} (no response body)`
  return `HTTP ${status}\n${JSON.stringify(data)}`
}

export function formatCreatePageError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `Error creating page: ${message}`
}
