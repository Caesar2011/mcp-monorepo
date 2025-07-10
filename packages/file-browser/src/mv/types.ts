// Input parameters for the mv tool
export interface MvToolParams {
  sourcePaths: string[] // List of source file or directory paths to move
  targetPaths: string[] // List of corresponding target paths
}

// Output result for the mv tool
export type MvToolResult = Array<{ source: string; target: string }>
