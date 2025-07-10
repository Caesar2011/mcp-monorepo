// Input types for the tree tool
export interface TreeToolParams {
  /**
   * Path relative to the server root (".") is the current working directory, default if omitted)
   */
  path?: string
  /**
   * Maximum depth to traverse (default: 3, max: 5)
   */
  depth?: number
}

export interface TreeNode {
  name: string
  type: 'FILE' | 'DIR'
  size?: number // Only applies if type === 'FILE'
  children?: TreeNode[] // Only applies if type === 'DIR'
  path: string // Relative path from root
}

export interface TreeToolResult {
  tree: TreeNode
  totalFiles: number
  totalDirectories: number
  maxDepthReached: number
  truncated: boolean // True if hit the 200 file limit
}
