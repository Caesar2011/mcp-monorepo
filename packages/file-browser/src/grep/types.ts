// Input types for the grep tool
export interface GrepToolParams {
  /**
   * Regex pattern to match against relative file/directory paths (from working directory)
   */
  pathPattern: string

  /**
   * Regex pattern to search for within the contents of matched files
   */
  contentPattern: string
}

export interface ValidatedGrepParams extends GrepToolParams {
  pathPattern: string // guaranteed to be valid
  contentPattern: string // guaranteed to be valid
}

export interface GrepMatch {
  file: string
  line: number
  match: string
  before: string[] // 2 lines before
  after: string[] // 2 lines after
}

export interface GrepToolResult {
  matches: GrepMatch[]
  totalMatches: number
  limited: boolean
}

export type GrepToolError = {
  code: string
  message: string
  details?: unknown
}
