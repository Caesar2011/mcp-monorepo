import type { FindToolResult } from './types.js'

// Main response formatting
export const formatResponse = (data: FindToolResult): string => {
  if (data.matches.length === 0) {
    return 'No matches found.'
  }

  // Format each match as "path size" on separate lines
  const lines = data.matches.map((match) => `${match.path} ${match.size}`)
  return lines.join('\n')
}

// Error formatting
export const formatError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'
  return `Error: ${message}`
}
