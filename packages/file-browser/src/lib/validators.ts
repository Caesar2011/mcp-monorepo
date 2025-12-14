import { stat } from 'node:fs/promises'
import { isAbsolute, normalize } from 'node:path'

import { logger } from '@mcp-monorepo/shared'

/**
 * Checks if a given absolute path (candidatePath) is a subpath of another absolute path (basePath).
 * @param {string} basePath - The parent path to check against.
 * @param {string} candidatePath - The path to check if it's within the basePath.
 * @throws {Error} - If either path is not absolute or candidatePath not is within basePath
 */
export function validateWithinBasePath(basePath: string, candidatePath: string) {
  if (!isAbsolute(basePath)) {
    logger.error('Base path must be an absolute path. Got: ', basePath, ' instead.')
    throw new Error('Base path must be an absolute path.')
  }

  if (!isAbsolute(candidatePath)) {
    logger.error('Candidate path must be an absolute path. Got: ', candidatePath, ' instead.')
    throw new Error('Candidate path must be an absolute path.')
  }

  const normalizedBase = normalize(basePath).replace(/[/\\]+$/, '') // Remove trailing slash
  const normalizedCandidate = normalize(candidatePath)

  if (!normalizedCandidate.startsWith(normalizedBase)) {
    logger.error(
      'Candidate path must be within base path. Got: ',
      normalizedCandidate,
      ' in base path: ',
      normalizedBase,
      ' instead.',
    )
    throw new Error('Candidate path must be within base path.')
  }
}

export async function validateExists(path: string) {
  try {
    await stat(path)
  } catch (_) {
    throw new Error('The provided path does not exist.')
  }
}

export async function validateDoesNotExists(path: string) {
  try {
    await stat(path)
    throw new Error('The provided path does exist.')
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code !== 'ENOENT') {
      throw error
    }
  }
}

export async function validateIsFile(path: string) {
  const fileStats = await stat(path)
  if (!fileStats.isFile()) {
    throw new Error('The provided path does not point to a valid file.')
  }
}

export async function validateIsDir(path: string) {
  const fileStats = await stat(path)
  if (!fileStats.isDirectory()) {
    throw new Error('The provided path does not point to a valid directory.')
  }
}
