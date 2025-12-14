import { isAbsolute, normalize } from 'node:path'

/**
 * Retrieves and validates the WORKING_DIR from environment variables.
 * Ensures the path is an absolute and normalized path.
 * Throws an error if the path is invalid, missing, or not absolute.
 *
 * @returns {string} - Normalized absolute path
 * @throws {Error} - If WORKING_DIR is invalid
 */
export function getWorkingDir() {
  const workingDir = process.env.WORKING_DIR

  if (!workingDir || workingDir.trim() === '') {
    throw new Error('WORKING_DIR environment variable is not set or empty.')
  }

  if (!isAbsolute(workingDir)) {
    throw new Error('WORKING_DIR must be an absolute path.')
  }

  return normalize(workingDir)
}
