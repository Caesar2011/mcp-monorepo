// Input types for the patch-file tool
export interface PatchReplacement {
  /**
   * Approximate start line number for the replacement
   */
  startLine: number
  /**
   * Approximate end line number for the replacement
   */
  endLine: number
  /**
   * Replacement string with 3 lines of context or <SOF>/<EOF> markers
   */
  replacement: string
}

export interface PatchFileToolParams {
  /**
   * Relative path to the file to patch (must exist)
   */
  filePath: string
  /**
   * List of replacements to apply (applied from end to beginning)
   */
  patches: PatchReplacement[]
}

export interface ValidatedPatchFileParams extends PatchFileToolParams {
  filePath: string // Now guaranteed to be valid
  patches: PatchReplacement[] // Now guaranteed to be valid
}

// Processing types
export interface PatchContext {
  beforeLines: string[]
  targetLines: string[]
  afterLines: string[]
}

export interface MatchedPatch {
  patch: PatchReplacement
  actualStartLine: number
  actualEndLine: number
  newContent: string
}

export interface PatchError {
  patch: PatchReplacement
  reason: string
  details?: string
}

export interface PatchFileResult {
  filePath: string
  appliedPatches: number
  totalPatches: number
  errors: PatchError[]
  bytesWritten: number
}

// Utility types
export interface FileLines {
  lines: string[]
  totalLines: number
}

export interface ContextMatch {
  startLine: number
  endLine: number
  matched: boolean
}

// Error types
export type PatchFileError = {
  code: string
  message: string
  details?: unknown
}
