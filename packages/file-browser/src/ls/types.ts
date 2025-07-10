// Input types for the ls tool
export interface LsToolParams {
  /**
   * Path relative to the server root ("." is the current working directory, default if omitted)
   */
  path?: string
}

export interface LsEntry {
  name: string
  type: 'FILE' | 'DIR'
  size?: number // Only applies if type === 'FILE'
}

export interface LsToolResult {
  entries: LsEntry[]
  directory: string
}
