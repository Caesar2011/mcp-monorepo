// Input types for the write tool
export interface WriteToolParams {
  /**
   * Relative path to the file to create or overwrite
   */
  filePath: string
  /**
   * Content to write to the file
   */
  content: string
}

export interface ValidatedWriteParams extends WriteToolParams {
  filePath: string // Now guaranteed to be valid
  content: string // Now guaranteed to exist
}

// Processing types
export interface WriteToolResult {
  filePath: string
  bytesWritten: number
  created: boolean // true if file was created, false if overwritten
}

// Error types
export type WriteToolError = {
  code: string
  message: string
  details?: unknown
}
