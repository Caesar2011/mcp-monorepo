import type { GetCurrentDatetimeResult } from './types.js'

export function formatDatetimeResponse(result: GetCurrentDatetimeResult): string {
  return `Current Date and Time:\n${result.datetime}`
}

export function formatDatetimeError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return `Error getting current datetime: ${message}`
}
