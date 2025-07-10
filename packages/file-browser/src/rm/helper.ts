import { rm } from 'fs/promises'
import { resolve, normalize, relative } from 'path'

import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'
import { isSubPath } from '../lib/isSubPath.js'

export const removePaths = async (paths: string[]): Promise<string[]> => {
  const workingDir = normalize(getWorkingDirectory())

  // Validate all paths first
  const fullPaths = paths.map((path) => {
    const resolvedPath = resolve(workingDir, path)
    if (!isSubPath(workingDir, resolvedPath)) {
      throw new Error(`Access forbidden: Cannot delete path outside working directory (${path}).`)
    }
    return resolvedPath
  })

  const deletedPaths: string[] = []

  // Perform deletion only after validation
  for (const fullPath of fullPaths) {
    try {
      await rm(fullPath, { force: true, recursive: true })
      deletedPaths.push(relative(workingDir, fullPath).replace(/\\/g, '/').replace(/^\.\//, ''))
    } catch (err) {
      throw new Error(`Failed to remove path: ${fullPath}. Error: ${err instanceof Error ? err.message : err}`)
    }
  }

  return deletedPaths
}
