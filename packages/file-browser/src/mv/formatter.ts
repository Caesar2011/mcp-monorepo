import type { MvToolResult } from './types.js'

export const formatSuccessResponse = (result: MvToolResult): string => {
  const movedFiles = result.map(({ source, target }) => `Moved: ${source} -> ${target}`).join('\n')
  return `Successfully moved the following paths:\n${movedFiles}`
}

export const formatErrorResponse = (error: unknown): string => {
  const message = error instanceof Error ? error.message : 'Unknown error occurred'
  return `Error: ${message}`
}
