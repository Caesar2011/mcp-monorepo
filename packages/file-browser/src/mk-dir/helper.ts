import { mkdir } from 'fs/promises'
import { resolve, normalize, relative } from 'path'

import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'
import { isSubPath } from '../lib/isSubPath.js'

export const createDirectories = async (paths: string[]): Promise<string[]> => {
  const workingDir = normalize(getWorkingDirectory())

  // Validate all paths first
  const fullPaths = paths.map((path) => {
    const resolvedPath = resolve(workingDir, path)
    if (!isSubPath(workingDir, resolvedPath)) {
      throw new Error(`Access forbidden: Cannot create directory outside working directory (${path}).`)
    }
    return resolvedPath
  })

  const createdPaths: string[] = []

  // Create directories only after validation
  for (const fullPath of fullPaths) {
    try {
      await mkdir(fullPath, { recursive: true })
      createdPaths.push(relative(workingDir, fullPath).replace(/\\/g, '/').replace(/^\.\//, ''))
    } catch (err) {
      throw new Error(`Failed to create directory: ${fullPath}. Error: ${err instanceof Error ? err.message : err}`)
    }
  }

  return createdPaths
}
