// Input types for the open tool
export interface OpenToolParams {
  /**
   * Array of relative file paths to open (max 5 files)
   */
  filePaths: string[]
}

export interface ValidatedOpenParams extends OpenToolParams {
  filePaths: string[] // Now guaranteed to be valid array
}

// Processing types
export interface FileContent {
  filePath: string
  content: string
  exists: boolean
  size: number // bytes
}

export interface OpenToolResult {
  files: FileContent[]
  totalFiles: number
}

// Error types
export type OpenToolError = {
  code: string
  message: string
  details?: unknown
}
