import { readdir, stat } from 'fs/promises'
import { join, normalize, resolve } from 'path'

import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'
import { isSubPath } from '../lib/isSubPath.js'

import type { LsEntry, LsToolParams, LsToolResult } from './types.js'

export const getDirectoryListing = async (params: LsToolParams): Promise<LsToolResult> => {
  // Normalize right away
  const workingDir = normalize(getWorkingDirectory())
  const dirPath = normalize(resolve(workingDir, params.path ?? '.'))

  if (!isSubPath(workingDir, dirPath)) {
    throw new Error('Access forbidden: Directory outside the working directory.')
  }

  const items = await readdir(dirPath, { withFileTypes: true })
  const entries: (LsEntry | undefined)[] = await Promise.all(
    items.map(async (item) => {
      if (item.isDirectory()) {
        return { name: item.name, type: 'DIR' }
      } else if (item.isFile()) {
        const fullPath = join(dirPath, item.name)
        const stats = await stat(fullPath)
        return {
          name: item.name,
          type: 'FILE',
          size: stats.size,
        }
      }
      // Skip non-file/non-dir (e.g., symlink, socket)
      return undefined
    }),
  )
  return {
    entries: entries.filter((x) => x !== undefined),
    directory: dirPath,
  }
}
