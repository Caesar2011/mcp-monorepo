import type { OpenToolResult, FileContent } from './types.js'

// Format individual file content
const formatFileContent = (file: FileContent): string => {
  const header = `=== ${file.filePath} ===`

  if (!file.exists) {
    return `${header}\nFile not found`
  }

  const metadata = `Size: ${file.size} bytes`
  return `${header}\n${metadata}\n\n\`\`\`\n${file.content}\n\`\`\``
}

// Main response formatting
export const formatResponse = (data: OpenToolResult): string => {
  if (data.totalFiles === 0) {
    return 'No files to display'
  }

  if (data.totalFiles === 1) {
    const file = data.files[0]
    return `Content of ${file.filePath}:\n\n\`\`\`\n${file.content}\n\`\`\``
  }

  // Multiple files - format with separators
  const header = `Contents of ${data.totalFiles} files:\n`
  const fileContents = data.files.map(formatFileContent).join('\n\n')

  return `${header}\n${fileContents}`
}

// Error formatting
export const formatError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'
  return `Error: ${message}`
}
