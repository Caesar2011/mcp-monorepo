import { readdir, stat } from 'fs/promises'
import { basename, join, normalize, relative } from 'path'

import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'
import { isIgnored } from '../lib/gitignore.js'
import { isSubPath } from '../lib/isSubPath.js'

import type { TreeToolParams, TreeToolResult, TreeNode } from './types.js'

interface QueueItem {
  path: string
  depth: number
  parent: TreeNode
}

export const buildDirectoryTree = async (params: TreeToolParams): Promise<TreeToolResult> => {
  // Normalize and validate inputs
  const workingDir = normalize(getWorkingDirectory())
  const targetPath = normalize(join(workingDir, params.path ?? '.'))
  const maxDepth = Math.min(params.depth ?? 3, 5) // Enforce max depth of 5

  // Security check - ensure path is within working directory
  if (!isSubPath(workingDir, targetPath)) {
    throw new Error('Access forbidden: Directory outside the working directory.')
  }

  // Initialize counters and flags
  let totalFiles = 0
  let totalDirectories = 0
  let maxDepthReached = 0
  let truncated = false
  const maxItems = 200

  // Get the relative path for the root
  const rootRelativePath = relative(workingDir, targetPath) || '.'

  // Check if root path is ignored
  if (await isIgnored(rootRelativePath, true)) {
    throw new Error('Access forbidden: Target directory is ignored by .gitignore.')
  }

  // Create root node
  const rootStat = await stat(targetPath)
  if (!rootStat.isDirectory()) {
    throw new Error('Target path is not a directory.')
  }

  const rootNode: TreeNode = {
    name: rootRelativePath === '.' ? basename(workingDir) : rootRelativePath.split('/').pop() || basename(workingDir),
    type: 'DIR',
    children: [],
    path: rootRelativePath,
  }

  totalDirectories++

  // BFS queue
  const queue: QueueItem[] = [
    {
      path: targetPath,
      depth: 0,
      parent: rootNode,
    },
  ]

  // BFS traversal
  while (queue.length > 0 && totalFiles + totalDirectories < maxItems) {
    const current = queue.shift()
    if (current === undefined) break
    const { path: currentPath, depth, parent } = current

    maxDepthReached = Math.max(maxDepthReached, depth)

    // Skip if we've reached max depth
    if (depth >= maxDepth) {
      continue
    }

    try {
      const items = await readdir(currentPath, { withFileTypes: true })

      // Process each item in the current directory
      for (const item of items) {
        // Check if we've hit the item limit
        if (totalFiles + totalDirectories >= maxItems) {
          truncated = true
          break
        }

        const itemPath = join(currentPath, item.name)
        const itemRelativePath = relative(workingDir, itemPath)

        // Check if item should be ignored
        const itemIsDirectory = item.isDirectory()
        if (await isIgnored(itemRelativePath, itemIsDirectory)) {
          continue
        }

        // Create tree node for this item
        const node: TreeNode = {
          name: item.name,
          type: itemIsDirectory ? 'DIR' : 'FILE',
          path: itemRelativePath,
        }

        if (itemIsDirectory) {
          node.children = []
          totalDirectories++

          // Add directory to queue for further processing
          queue.push({
            path: itemPath,
            depth: depth + 1,
            parent: node,
          })
        } else if (item.isFile()) {
          // Get file size
          try {
            const fileStat = await stat(itemPath)
            node.size = fileStat.size
            totalFiles++
          } catch {
            // Skip files we can't stat
            continue
          }
        }
        // Skip other types (symlinks, etc.)
        else {
          continue
        }

        // Add node to parent's children
        parent.children?.push(node)
      }

      // Break if we hit the limit during this directory
      if (truncated) {
        break
      }
    } catch {
      // Skip directories we can't read
    }
  }

  // Check if truncated due to remaining queue items
  if (queue.length > 0 && !truncated) {
    truncated = true
  }

  return {
    tree: rootNode,
    totalFiles,
    totalDirectories,
    maxDepthReached,
    truncated,
  }
}
