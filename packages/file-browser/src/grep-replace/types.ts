// Input types for the grep-replace tool
export interface GrepReplaceToolParams {
  /**
   * Regex pattern to match against relative file/directory paths (from working directory)
   */
  pathPattern: string

  /**
   * Regex pattern to search for within the contents of matched files
   */
  contentPattern: string

  /**
   * Replacement string. Supports replacement groups like $1, $2, etc.
   */
  replacement: string
}

export interface ValidatedGrepReplaceParams extends GrepReplaceToolParams {
  pathPattern: string // guaranteed to be valid
  contentPattern: string // guaranteed to be valid
  replacement: string
}

export interface GrepReplaceMatch {
  file: string
  replacementCount: number
}

export interface GrepReplaceToolResult {
  matches: GrepReplaceMatch[]
  totalReplacements: number
  filesModified: string[] // unique file names
}

export type GrepReplaceToolError = {
  code: string
  message: string
  details?: unknown
}
