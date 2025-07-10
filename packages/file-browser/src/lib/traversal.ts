import { readdir, stat } from 'fs/promises'
import { join, normalize, relative } from 'path'

import { getWorkingDirectory } from './getWorkingDirectory.js'
import { isIgnored } from './gitignore.js'
import { isSubPath } from './isSubPath.js'

// Types for traversal functionality
export interface TraversalMatch {
  path: string // Relative path from working directory
  fullPath: string // Absolute path
  isDirectory: boolean
  size: number
}

export type TraversalCallback = (match: TraversalMatch) => Promise<boolean | void> | boolean | void

export interface TraversalOptions {
  pathPattern: RegExp
  callback: TraversalCallback
  maxResults?: number
  workingDir?: string
}

// Check if path matches regex pattern
export const matchesPathPattern = (relativePath: string, pattern: RegExp): boolean => {
  // Normalize path separators for consistent matching
  const normalizedPath = relativePath.replace(/\\/g, '/')
  return pattern.test(normalizedPath)
}

// Get file/directory size
export const getFileSize = async (filePath: string): Promise<number> => {
  try {
    const stats = await stat(filePath)
    return stats.size
  } catch {
    return 0
  }
}

// Core DFS traversal implementation
export const traverseDirectory = async (
  dirPath: string,
  workingDir: string,
  options: {
    pathPattern: RegExp
    callback: TraversalCallback
    maxResults?: number
    resultsCount: { value: number }
  },
  visited: Set<string> = new Set(),
): Promise<void> => {
  // Stop if we've reached the limit
  if (options.maxResults && options.resultsCount.value >= options.maxResults) {
    return
  }

  // Prevent infinite loops from symlinks
  const realPath = normalize(dirPath)
  if (visited.has(realPath)) {
    return
  }
  visited.add(realPath)

  try {
    const entries = await readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      // Stop if we've reached the limit
      if (options.maxResults && options.resultsCount.value >= options.maxResults) {
        return
      }

      const fullPath = normalize(join(dirPath, entry.name))
      const relativePath = relative(workingDir, fullPath) ?? ''

      // Skip if path is ignored by gitignore
      if (await isIgnored(relativePath, entry.isDirectory())) {
        continue
      }

      // Check if current path matches the path pattern
      if (matchesPathPattern(relativePath, options.pathPattern)) {
        const size = await getFileSize(fullPath)
        const match: TraversalMatch = {
          path: relativePath,
          fullPath,
          isDirectory: entry.isDirectory(),
          size,
        }

        // Call the callback - it can return false to stop traversal
        const shouldContinue = await options.callback(match)
        if (shouldContinue === false) {
          return
        }

        options.resultsCount.value++
      }

      // Recursively traverse subdirectories
      if (entry.isDirectory()) {
        await traverseDirectory(fullPath, workingDir, options, visited)
      }
    }
  } catch {
    // Skip directories we can't read (permission issues, etc.)
    // This follows the same pattern as other file-browser tools
  }
}

// Main traversal function with callback
export const traverseWithCallback = async (options: TraversalOptions): Promise<number> => {
  // Get working directory and validate security
  const workingDir = normalize(options.workingDir || getWorkingDirectory())
  const searchDir = workingDir // Start search from working directory

  // Security check: ensure we're searching within working directory
  if (!isSubPath(workingDir, searchDir)) {
    throw new Error('Access forbidden: Search path outside the working directory.')
  }

  // Track results count
  const resultsCount = { value: 0 }

  // Perform DFS traversal with callback
  await traverseDirectory(searchDir, workingDir, {
    pathPattern: options.pathPattern,
    callback: options.callback,
    maxResults: options.maxResults,
    resultsCount,
  })

  return resultsCount.value
}

// Convenience function to collect all matches (for find tool)
export const collectMatches = async (
  pathPattern: RegExp,
  maxResults?: number,
  workingDir?: string,
): Promise<TraversalMatch[]> => {
  const matches: TraversalMatch[] = []

  await traverseWithCallback({
    pathPattern,
    callback: (match) => {
      matches.push(match)
    },
    maxResults,
    workingDir,
  })

  // Sort matches by path for consistent output
  matches.sort((a, b) => a.path.localeCompare(b.path))

  return matches
}
