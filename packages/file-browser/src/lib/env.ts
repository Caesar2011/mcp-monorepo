import { isAbsolute, normalize } from 'node:path'

let _workingDir: string | undefined

/**
 * Retrieves and validates the WORKING_DIR from environment variables.
 * The result is cached for subsequent calls.
 *
 * @returns {string} - Normalized absolute path
 * @throws {Error} - If WORKING_DIR is invalid, missing, or not absolute.
 */
export function getWorkingDir(): string {
  if (_workingDir !== undefined) {
    return _workingDir
  }

  const workingDirEnv = process.env.WORKING_DIR

  if (!workingDirEnv || workingDirEnv.trim() === '') {
    throw new Error('WORKING_DIR environment variable is not set or empty.')
  }

  if (!isAbsolute(workingDirEnv)) {
    throw new Error('WORKING_DIR must be an absolute path.')
  }

  _workingDir = normalize(workingDirEnv)
  return _workingDir
}
