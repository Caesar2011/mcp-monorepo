import { rename } from 'fs/promises'
import { resolve, normalize } from 'path'

import { type MvToolResult } from './types.js'
import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'
import { isSubPath } from '../lib/isSubPath.js'

export const movePaths = async (sourcePaths: string[], targetPaths: string[]): Promise<MvToolResult> => {
  if (sourcePaths.length !== targetPaths.length) {
    throw new Error('Source and target paths must have the same length.')
  }

  const workingDir = normalize(getWorkingDirectory())
  const movedPaths: MvToolResult = []

  for (let i = 0; i < sourcePaths.length; i++) {
    const sourceResolved = normalize(resolve(workingDir, sourcePaths[i]))
    const targetResolved = normalize(resolve(workingDir, targetPaths[i]))

    if (!isSubPath(workingDir, sourceResolved) || !isSubPath(workingDir, targetResolved)) {
      throw new Error(
        `Access forbidden: Paths must remain within the working directory (${sourcePaths[i]} -> ${targetPaths[i]}).`,
      )
    }

    try {
      await rename(sourceResolved, targetResolved)
      movedPaths.push({
        source: sourcePaths[i],
        target: targetPaths[i],
      })
    } catch (err) {
      throw new Error(
        `Failed to move path: ${sourcePaths[i]} -> ${targetPaths[i]}. Error: ${err instanceof Error ? err.message : err}`,
      )
    }
  }

  return movedPaths
}
