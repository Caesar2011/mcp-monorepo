import { readFile, writeFile, stat } from 'fs/promises'
import { normalize, resolve } from 'path'

import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'
import { isSubPath } from '../lib/isSubPath.js'

import type {
  PatchFileToolParams,
  ValidatedPatchFileParams,
  PatchFileResult,
  PatchReplacement,
  PatchError,
  FileLines,
  ContextMatch,
} from './types.js'

// Input validation
export const validateInput = (params: PatchFileToolParams): ValidatedPatchFileParams => {
  if (!params.filePath || typeof params.filePath !== 'string') {
    throw new Error('filePath is required and must be a string')
  }

  if (params.filePath.trim() === '') {
    throw new Error('filePath cannot be empty')
  }

  if (!Array.isArray(params.patches) || params.patches.length === 0) {
    throw new Error('patches must be a non-empty array')
  }

  // Validate each patch
  for (let i = 0; i < params.patches.length; i++) {
    const patch = params.patches[i]
    if (typeof patch.startLine !== 'number' || patch.startLine < 1) {
      throw new Error(`patches[${i}].startLine must be a positive number`)
    }
    if (typeof patch.endLine !== 'number' || patch.endLine < 1) {
      throw new Error(`patches[${i}].endLine must be a positive number`)
    }
    if (patch.startLine > patch.endLine) {
      throw new Error(`patches[${i}].startLine cannot be greater than endLine`)
    }
    if (typeof patch.replacement !== 'string') {
      throw new Error(`patches[${i}].replacement must be a string`)
    }
  }

  return params as ValidatedPatchFileParams
}

// Check if file exists
export const checkFileExists = async (filePath: string): Promise<boolean> => {
  try {
    const stats = await stat(filePath)
    return stats.isFile()
  } catch {
    return false
  }
}

// Read file and split into lines
export const readFileLines = async (filePath: string): Promise<FileLines> => {
  const content = await readFile(filePath, 'utf8')
  const lines = content.split('\n')
  return {
    lines,
    totalLines: lines.length,
  }
}

// Parse replacement content to extract context and new content
export const parseReplacement = (
  replacement: string,
): { beforeContext: string[]; newContent: string; afterContext: string[] } => {
  const lines = replacement.split('\n')

  // Handle <SOF> marker
  if (lines[0] === '<SOF>') {
    return {
      beforeContext: [],
      newContent: lines.slice(1, lines.length - 3).join('\n'),
      afterContext: lines.slice(-3),
    }
  }

  // Handle <EOF> marker
  if (lines[lines.length - 1] === '<EOF>') {
    return {
      beforeContext: lines.slice(0, 3),
      newContent: lines.slice(3, -1).join('\n'),
      afterContext: [],
    }
  }

  // Normal case with 3 lines of context before and after
  if (lines.length < 6) {
    throw new Error('Replacement must have at least 6 lines: 3 context before + content + 3 context after')
  }

  return {
    beforeContext: lines.slice(0, 3),
    newContent: lines.slice(3, lines.length - 3).join('\n'),
    afterContext: lines.slice(-3),
  }
}

// Unified function to find all context matches
export const findContextMatches = (fileLines: string[], approximateLine: number, context: string[]): number[] => {
  if (context.length === 0) {
    return [approximateLine] // If no context, use approximate position
  }
  const matches: number[] = []
  const searchStart = Math.max(0, approximateLine - 10)
  const searchEnd = Math.min(fileLines.length - context.length, approximateLine + 10)
  for (let i = searchStart; i <= searchEnd; i++) {
    let found = true
    for (let j = 0; j < context.length; j++) {
      if (fileLines[i + j]?.trim() !== context[j]?.trim()) {
        found = false
        break
      }
    }
    if (found) {
      matches.push(i)
    }
  }
  return matches
}

// Find best/closest match to approximate position
const findClosest = (candidates: number[], approximate: number): number | undefined => {
  if (!candidates.length) return undefined
  return candidates.reduce((best, curr) => {
    const bestDist = Math.abs(best - approximate)
    const currDist = Math.abs(curr - approximate)
    if (currDist < bestDist) return curr
    if (currDist === bestDist && curr < best) return curr // prefer first occurrence if equidistant
    return best
  }, candidates[0])
}

// Main context match (returns first/last line index)
export const findBestContextMatch = (
  fileLines: string[],
  startLine: number,
  endLine: number,
  beforeContext: string[],
  afterContext: string[],
): ContextMatch => {
  const startCandidates = findContextMatches(fileLines, startLine - 1, beforeContext)
  const endCandidatesRaw = findContextMatches(fileLines, endLine - 1, afterContext)
  // For end context, convert indices to last line of context
  const endCandidates =
    afterContext.length === 0 ? endCandidatesRaw : endCandidatesRaw.map((i) => i + afterContext.length - 1)
  const start = findClosest(startCandidates, startLine - 1)
  const end = findClosest(endCandidates, endLine - 1)
  if (start !== undefined && end !== undefined && start <= end) {
    return { startLine: start, endLine: end, matched: true }
  }
  return { startLine: startLine - 1, endLine: endLine - 1, matched: false }
}

// Apply a single patch to file lines
export const applyPatch = (
  fileLines: string[],
  patch: PatchReplacement,
): { success: boolean; error?: PatchError; newLines?: string[] } => {
  try {
    const { beforeContext, newContent, afterContext } = parseReplacement(patch.replacement)
    const match = findBestContextMatch(fileLines, patch.startLine, patch.endLine, beforeContext, afterContext)

    if (!match.matched) {
      return {
        success: false,
        error: {
          patch,
          reason: 'Context not found',
          details: 'Could not find matching context lines in the specified range',
        },
      }
    }

    // Create new file content with the patch applied
    const newLines = [
      ...fileLines.slice(0, match.startLine + beforeContext.length),
      ...newContent.split('\n'),
      ...fileLines.slice(match.endLine + 1 - afterContext.length),
    ]

    return {
      success: true,
      newLines,
    }
  } catch (error) {
    return {
      success: false,
      error: {
        patch,
        reason: 'Parse error',
        details: error instanceof Error ? error.message : 'Unknown parsing error',
      },
    }
  }
}

// Sort patches by end line in descending order (end to beginning)
export const sortPatchesByEndLine = (patches: PatchReplacement[]): PatchReplacement[] => {
  return [...patches].sort((a, b) => b.endLine - a.endLine)
}

// Apply all patches to file content
export const applyPatches = async (params: ValidatedPatchFileParams): Promise<PatchFileResult> => {
  // Normalize paths
  const workingDir = normalize(getWorkingDirectory())
  const targetPath = normalize(resolve(workingDir, params.filePath))

  // Security check: ensure target is within working directory
  if (!isSubPath(workingDir, targetPath)) {
    throw new Error('Access forbidden: File path outside the working directory.')
  }

  // Check if file exists
  const fileExists = await checkFileExists(targetPath)
  if (!fileExists) {
    throw new Error('File does not exist')
  }

  // Read file content
  const fileData = await readFileLines(targetPath)
  let currentLines = fileData.lines

  // Sort patches by end line (descending order for end-to-beginning application)
  const sortedPatches = sortPatchesByEndLine(params.patches)

  const errors: PatchError[] = []
  let appliedCount = 0

  // Apply patches from end to beginning
  for (const patch of sortedPatches) {
    const result = applyPatch(currentLines, patch)

    if (result.success && result.newLines) {
      currentLines = result.newLines
      appliedCount++
    } else if (result.error) {
      errors.push(result.error)
    }
  }

  // Write modified content back to file
  const newContent = currentLines.join('\n')
  await writeFile(targetPath, newContent, 'utf8')

  // Calculate bytes written
  const bytesWritten = Buffer.byteLength(newContent, 'utf8')

  return {
    filePath: targetPath,
    appliedPatches: appliedCount,
    totalPatches: params.patches.length,
    errors,
    bytesWritten,
  }
}
