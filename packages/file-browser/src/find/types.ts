// Input types for the find tool
export interface FindToolParams {
  /**
   * Regex pattern to match against relative file/directory paths
   */
  pattern: string
}

export interface ValidatedFindParams extends FindToolParams {
  pattern: string // Now guaranteed to be valid
}

// Processing types
export interface FindMatch {
  path: string
  size: number
  isDirectory: boolean
}

export interface FindToolResult {
  matches: FindMatch[]
  totalMatches: number
}

// Error types
export type FindToolError = {
  code: string
  message: string
  details?: unknown
}
