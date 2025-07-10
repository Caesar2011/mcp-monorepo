import type { PatchFileResult, PatchError } from './types.js'

// Format successful patch operation result
export const formatResponse = (data: PatchFileResult): string => {
  const lines: string[] = []

  // Summary line
  lines.push(`Patched file: ${data.filePath}`)
  lines.push(`Applied ${data.appliedPatches}/${data.totalPatches} patches`)
  lines.push(`Bytes written: ${data.bytesWritten}`)

  // Add errors if any
  if (data.errors.length > 0) {
    lines.push('')
    lines.push('Errors:')

    data.errors.forEach((error, index) => {
      lines.push(` ${index + 1}. Lines ${error.patch.startLine}-${error.patch.endLine}: ${error.reason}`)
      if (error.details) {
        lines.push(` Details: ${error.details}`)
      }
    })
  }

  return lines.join('\n')
}

// Format patch error details
export const formatPatchError = (error: PatchError): string => {
  const parts = [`Lines ${error.patch.startLine}-${error.patch.endLine}:`, error.reason]

  if (error.details) {
    parts.push(`(${error.details})`)
  }

  return parts.join(' ')
}

// Format general errors
export const formatError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'
  return `Error: ${message}`
}

// Format patch summary for successful operations
export const formatPatchSummary = (appliedCount: number, totalCount: number): string => {
  if (appliedCount === totalCount) {
    return `Successfully applied all ${totalCount} patches`
  } else if (appliedCount === 0) {
    return `Failed to apply any of the ${totalCount} patches`
  } else {
    return `Applied ${appliedCount} out of ${totalCount} patches`
  }
}
