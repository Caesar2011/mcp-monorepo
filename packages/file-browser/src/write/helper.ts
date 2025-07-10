import { writeFile, stat } from 'fs/promises'
import { mkdir } from 'fs/promises'
import { dirname, normalize, resolve } from 'path'

import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'
import { isSubPath } from '../lib/isSubPath.js'

import type { WriteToolParams, ValidatedWriteParams, WriteToolResult } from './types.js'

// Input validation
export const validateInput = (params: WriteToolParams): ValidatedWriteParams => {
  if (!params.filePath || typeof params.filePath !== 'string') {
    throw new Error('filePath is required and must be a string')
  }

  if (params.filePath.trim() === '') {
    throw new Error('filePath cannot be empty')
  }

  if (typeof params.content !== 'string') {
    throw new Error('content must be a string')
  }

  return params as ValidatedWriteParams
}

// Check if file exists
export const checkFileExists = async (filePath: string): Promise<boolean> => {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

// Ensure directory exists
export const ensureDirectoryExists = async (filePath: string): Promise<void> => {
  const dir = dirname(filePath)
  try {
    await mkdir(dir, { recursive: true })
  } catch (error) {
    // Only throw if it's not an "already exists" error
    if (error instanceof Error && !error.message.includes('EEXIST')) {
      throw error
    }
  }
}

// Write file content
export const writeFileContent = async (params: ValidatedWriteParams): Promise<WriteToolResult> => {
  // Normalize paths
  const workingDir = normalize(getWorkingDirectory())
  const targetPath = normalize(resolve(workingDir, params.filePath))

  // Security check: ensure target is within working directory
  if (!isSubPath(workingDir, targetPath)) {
    throw new Error('Access forbidden: File path outside the working directory.')
  }

  // Check if file already exists
  const fileExists = await checkFileExists(targetPath)

  // Ensure parent directory exists
  await ensureDirectoryExists(targetPath)

  // Write the file
  await writeFile(targetPath, params.content, 'utf8')

  // Calculate bytes written
  const bytesWritten = Buffer.byteLength(params.content, 'utf8')

  return {
    filePath: targetPath,
    bytesWritten,
    created: !fileExists,
  }
}
