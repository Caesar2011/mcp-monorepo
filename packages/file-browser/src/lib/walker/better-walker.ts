import { type Stats } from 'fs'
import { lstat, readdir, stat } from 'node:fs/promises'
import { platform } from 'node:os'
import { basename, join, relative } from 'node:path'

import { logger } from '@mcp-monorepo/shared'

import { IgnoreFileService } from './ignore-file-service.js'

export function getTypeFromStats(entry: Stats) {
  if (entry.isDirectory()) {
    return 'folder' as const
  } else if (entry.isFile()) {
    return 'file' as const
  } else if (entry.isBlockDevice()) {
    return 'block device' as const
  } else if (entry.isCharacterDevice()) {
    return 'character device' as const
  } else if (entry.isFIFO()) {
    return 'FIFO' as const
  } else if (entry.isSocket()) {
    return 'socket' as const
  } else if (entry.isSymbolicLink()) {
    return 'symbolic link' as const
  }
  return 'unknown' as const
}

export type StatType = ReturnType<typeof getTypeFromStats>

/**
 * Options for traversing a directory using Breadth-First Search (BFS).
 */
interface TraverseOptions {
  /** The absolute path to the directory to traverse. */
  absoluteFolderPath: string
  /**
   * An array of file names containing ignore patterns.
   * Each file should contain one pattern per line.
   * @default []
   */
  ignoreFiles?: string[]
  /**
   * Whether to follow symbolic links.
   * Symbolic links are only followed if this is true and the operating system is not Windows.
   * @default false
   */
  followSymLinks?: boolean
  /**
   * The maximum depth to traverse.
   * A depth of 0 means only the starting directory is processed.
   * @default Infinity
   */
  maxDepth?: number
  /**
   * The maximum number of entries (files/directories) to yield.
   * The traversal stops once this limit is reached.
   * @default Infinity
   */
  maxEntries?: number
  /**
   * Whether to include empty directories in the traversal results. Dirs with content are never included.
   * If set to `true`, empty directories will be yielded as part of the traversal.
   * If set to `false`, empty directories will be skipped.
   * @default false
   */
  includeEmptyDir?: boolean
}

/**
 * Asynchronously traverses a directory using Breadth-First Search (BFS) and yields each file/directory path.
 *
 * @param opts Options for the traversal, including the relative folder path, whether to follow symbolic links, max depth, and max entries.
 * @returns An asynchronous generator that yields relative paths of files and directories.
 */
export async function* traverseDirectoryBFS(
  opts: TraverseOptions,
): AsyncGenerator<{ relPath: string; type: StatType }> {
  const {
    absoluteFolderPath,
    ignoreFiles = ['.gitignore'],
    followSymLinks = false,
    maxDepth = Infinity,
    maxEntries = Infinity,
    includeEmptyDir = false,
  } = opts
  const isWindows = platform() === 'win32'

  const ignoreService = new IgnoreFileService()
  ignoreService.addByContent(absoluteFolderPath, '/.git/')

  // Queue stores tuples of [path, depth]
  const baseDirStats = await lstat(absoluteFolderPath)
  if (!baseDirStats.isDirectory()) {
    throw new Error('The provided path is not a directory.')
  }
  const queue: { stats: Stats; currentPath: string; currentDepth: number }[] = [
    {
      stats: await lstat(absoluteFolderPath),
      currentPath: absoluteFolderPath,
      currentDepth: 0,
    },
  ]
  const visited = new Set<string>()
  let yieldedCount = 0

  const addAllChildsToQueue = async (currentPath: string, currentDepth: number) => {
    const dirents = await readdir(currentPath, { withFileTypes: true })
    if (dirents.length === 0) return false
    if (ignoreService.couldDirectoryContainAllowedFiles(currentPath)) {
      for (const dirent of dirents) {
        const fullPath = join(currentPath, dirent.name)
        try {
          const stats = await lstat(fullPath)
          if (stats.isFile() && ignoreFiles.includes(basename(fullPath))) {
            await ignoreService.add(fullPath)
          }
          queue.push({
            stats,
            currentPath: fullPath,
            currentDepth: currentDepth + 1,
          })
        } catch (error) {
          logger.error(`Error accessing path ${currentPath}:`, error)
        }
      }
    }
    return true
  }

  const yieldPath = (path: string, stats: Stats) => {
    const relPath = relative(absoluteFolderPath, path).replace(/\\/g, '/')
    if (relPath !== '') {
      yieldedCount++
      return { relPath, type: getTypeFromStats(stats) }
    }
    return undefined
  }

  while (yieldedCount < maxEntries) {
    const shifted = queue.shift()
    if (!shifted) break
    let { stats } = shifted
    const { currentPath, currentDepth } = shifted
    if (currentDepth > maxDepth) break

    if (visited.has(currentPath)) {
      continue
    }
    visited.add(currentPath)

    if (stats.isSymbolicLink() && followSymLinks && !isWindows) {
      try {
        // follow sym link
        stats = await stat(currentPath)
      } catch (error) {
        logger.error(`Error accessing path ${currentPath}:`, error)
      }
    }

    let shouldYield = true
    if (stats.isDirectory()) {
      const hasChildren = await addAllChildsToQueue(currentPath, currentDepth)
      const shouldYieldDir = (!hasChildren && includeEmptyDir) || currentDepth === maxDepth
      shouldYield = shouldYieldDir && !ignoreService.isPathIgnored(currentPath.replace(/\/?$/, '/'))
    } else {
      shouldYield = !ignoreService.isPathIgnored(currentPath)
    }

    if (shouldYield) {
      const toYield = yieldPath(currentPath, stats)
      if (toYield) yield toYield
    }
  }
}
