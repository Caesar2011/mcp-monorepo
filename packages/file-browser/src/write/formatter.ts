import path from 'path'

import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'

import type { WriteToolResult } from './types.js'

// Main response formatting
export const formatResponse = (data: WriteToolResult): string => {
  const action = data.created ? 'Created' : 'Overwritten'
  // Always display relative to working directory
  const relPath = path.relative(getWorkingDirectory(), data.filePath)
  const lines = [`${action} file: ${relPath}`, `Bytes written: ${data.bytesWritten}`]
  return lines.join('\n')
}

// Error formatting
export const formatError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'
  return `Error: ${message}`
}
