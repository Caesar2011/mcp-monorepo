import type { LsToolResult } from './types.js'

export const formatResponse = (data: LsToolResult): string => {
  const lines = data.entries.map((entry) => {
    const kind = entry.type === 'DIR' ? 'DIR ' : 'FILE'
    const sizeStr = entry.type === 'FILE' && entry.size !== undefined ? ` (${entry.size} bytes)` : ''
    return `${kind}\t${entry.name}${sizeStr}`
  })
  return `Directory: ${data.directory}\n` + lines.join('\n')
}

export const formatError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return `Error: ${message}`
}
