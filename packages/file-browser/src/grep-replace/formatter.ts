import type { GrepReplaceToolResult, GrepReplaceMatch } from './types.js'

// Format a single grep-replace match
export const formatMatch = (match: GrepReplaceMatch): string => {
  return `${match.file}: ${match.replacementCount} replacement${match.replacementCount === 1 ? '' : 's'}`
}

// Main response formatting
export const formatResponse = (data: GrepReplaceToolResult): string => {
  if (data.matches.length === 0) {
    return 'No matches found. No files were modified.'
  }

  const lines: string[] = []

  // Add summary
  lines.push(
    `Completed ${data.totalReplacements} replacement${data.totalReplacements === 1 ? '' : 's'} in ${data.filesModified.length} file${data.filesModified.length === 1 ? '' : 's'}.`,
  )
  lines.push('')

  // Add details for each file
  lines.push('Files modified:')
  data.matches.forEach((match) => {
    lines.push(` ${formatMatch(match)}`)
  })

  return lines.join('\n')
}

// Error formatting
export const formatError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'
  return `Error: ${message}`
}
