import { readFile, stat } from 'fs/promises'
import { normalize, resolve } from 'path'

import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'
import { isSubPath } from '../lib/isSubPath.js'

import type { OpenToolParams, ValidatedOpenParams, FileContent, OpenToolResult } from './types.js'

// Input validation for multiple files
export const validateMultipleInput = (params: OpenToolParams): ValidatedOpenParams => {
  if (!params.filePaths || !Array.isArray(params.filePaths)) {
    throw new Error('filePaths is required and must be an array')
  }

  if (params.filePaths.length === 0) {
    throw new Error('At least one file path must be provided')
  }

  if (params.filePaths.length > 5) {
    throw new Error('Maximum 5 files can be opened at once')
  }

  // Validate each file path
  for (const filePath of params.filePaths) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Each file path must be a non-empty string')
    }

    if (filePath.trim() === '') {
      throw new Error('File paths cannot be empty')
    }
  }

  return params as ValidatedOpenParams
}

// Check if file exists and get stats
export const getFileStats = async (filePath: string): Promise<{ exists: boolean; size: number }> => {
  try {
    const stats = await stat(filePath)
    return {
      exists: true,
      size: stats.size,
    }
  } catch {
    return {
      exists: false,
      size: 0,
    }
  }
}

// Read file content safely
export const readFileContent = async (filePath: string): Promise<string> => {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      throw new Error(`File not found: ${filePath}`)
    }
    throw error
  }
}

// Process single file
export const processFile = async (filePath: string, workingDir: string): Promise<FileContent> => {
  // Normalize paths
  const targetPath = normalize(resolve(workingDir, filePath))

  // Security check: ensure target is within working directory
  if (!isSubPath(workingDir, targetPath)) {
    throw new Error(`Access forbidden: File path '${filePath}' is outside the working directory`)
  }

  // Get file stats
  const { exists, size } = await getFileStats(targetPath)

  let content = ''
  if (exists) {
    content = await readFileContent(targetPath)
  }

  return {
    filePath: filePath, // Return the original relative path
    content,
    exists,
    size,
  }
}

// Open multiple files
export const openFiles = async (params: ValidatedOpenParams): Promise<OpenToolResult> => {
  const workingDir = normalize(getWorkingDirectory())
  const files: FileContent[] = []

  // Process each file
  for (const filePath of params.filePaths) {
    const fileContent = await processFile(filePath, workingDir)
    files.push(fileContent)
  }

  return {
    files,
    totalFiles: files.length,
  }
}
