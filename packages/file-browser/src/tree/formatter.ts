import type { TreeToolResult, TreeNode } from './types.js'

/**
 * Format the tree result as a JSON string
 */
export const formatTreeResponse = (result: TreeToolResult): string => {
  const summary = formatSummary(result)
  const cleanTree = cleanTreeForOutput(result.tree)
  const treeJson = JSON.stringify(cleanTree, undefined, 2)

  return `${summary}\n\n${treeJson}`
}

/**
 * Format error messages for tree operations
 */
export const formatTreeError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : 'Unknown error occurred'
  return `Tree Error: ${message}`
}

// Internal formatting helpers
const formatSummary = (result: TreeToolResult): string => {
  const parts = [
    `📁 Tree Summary:`,
    `Files: ${result.totalFiles}`,
    `Directories: ${result.totalDirectories}`,
    `Max Depth Reached: ${result.maxDepthReached}`,
  ]

  if (result.truncated) {
    parts.push(`⚠️ Results truncated (200+ items)`)
  }

  return parts.join(' | ')
}

/**
 * Clean the tree structure for output by removing children property from files
 */
const cleanTreeForOutput = (node: TreeNode) => {
  const cleaned = {
    name: node.name,
    type: node.type,
    path: node.path,
  } as { name: string; type: 'FILE' | 'DIR'; path: string; size?: number; children?: TreeNode[] }

  if (node.type === 'FILE' && node.size !== undefined) {
    cleaned.size = node.size
  }

  if (node.type === 'DIR' && node.children) {
    cleaned.children = node.children.map((child) => cleanTreeForOutput(child))
  }

  return cleaned
}
