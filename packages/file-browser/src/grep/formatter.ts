import type { GrepToolResult, GrepMatch } from './types.js'

// Format a single grep match with context
export const formatMatch = (match: GrepMatch): string => {
  const lines: string[] = []

  // Add separator for multiple matches (except for the first one)
  lines.push(`${match.file}:${match.line}`)

  // Add context before the match
  match.before.forEach((line, index) => {
    const contextLineNumber = match.line - match.before.length + index
    lines.push(`${contextLineNumber}-${line}`)
  })

  // Add the matching line (highlighted with >)
  lines.push(`${match.line}:${match.match}`)

  // Add context after the match
  match.after.forEach((line, index) => {
    const contextLineNumber = match.line + 1 + index
    lines.push(`${contextLineNumber}-${line}`)
  })

  return lines.join('\n')
}

// Main response formatting
export const formatResponse = (data: GrepToolResult): string => {
  if (data.matches.length === 0) {
    return 'No matches found.'
  }

  // Format each match with context
  const formattedMatches = data.matches.map(formatMatch)
  let result = formattedMatches.join('\n--\n')

  // Add note if results were limited
  if (data.limited) {
    result += `\n\nNote: Results limited to 30 matches. There may be more matches available.`
  }

  return result
}

// Error formatting
export const formatError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'
  return `Error: ${message}`
}
