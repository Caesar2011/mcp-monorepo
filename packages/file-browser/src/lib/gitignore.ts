import { readFile } from 'fs/promises'
import { join, normalize } from 'path'

import ignore from 'ignore'

import { getWorkingDirectory } from './getWorkingDirectory.js'

let gitignoreInstance: ReturnType<typeof ignore> | undefined
let gitignoreLoaded = false

/**
 * Load and parse .gitignore file from the working directory
 */
export const loadGitignore = async (): Promise<ReturnType<typeof ignore>> => {
  if (gitignoreLoaded) {
    return gitignoreInstance || ignore()
  }

  try {
    const workingDir = normalize(getWorkingDirectory())
    const gitignorePath = join(workingDir, '.gitignore')
    const gitignoreContent = await readFile(gitignorePath, 'utf-8')

    gitignoreInstance = ignore().add(gitignoreContent)
  } catch {
    // No .gitignore file or can't read it - create empty ignore instance
    gitignoreInstance = ignore()
  }

  gitignoreLoaded = true
  return gitignoreInstance
}

/**
 * Check if a file or directory should be ignored according to .gitignore rules
 * @param relativePath Path relative to the working directory
 * @param isDirectory Whether the path is a directory
 */
export const isIgnored = async (relativePath: string, isDirectory: boolean = false): Promise<boolean> => {
  const ig = await loadGitignore()

  // Normalize the path for consistent checking
  const normalizedPath = normalize(relativePath).replace(/\\/g, '/')

  // For directories, we need to check both with and without trailing slash
  if (isDirectory) {
    return ig.ignores(normalizedPath) || ig.ignores(normalizedPath + '/')
  }

  return ig.ignores(normalizedPath)
}

/**
 * Reset the gitignore cache (useful for testing)
 */
export const resetGitignoreCache = (): void => {
  gitignoreInstance = undefined
  gitignoreLoaded = false
}
