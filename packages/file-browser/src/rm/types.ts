// Input parameters for the rm tool
export interface RmToolParams {
  paths: string[] // List of file or directory paths to remove
}

// Output result for the rm tool
export interface RmToolResult {
  deletedPaths: string[] // List of successfully deleted paths
}
