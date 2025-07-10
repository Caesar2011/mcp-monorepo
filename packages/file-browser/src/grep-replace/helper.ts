import { readFile, writeFile } from 'fs/promises'

import { traverseWithCallback, type TraversalMatch } from '../lib/traversal.js'

import type {
  GrepReplaceToolParams,
  ValidatedGrepReplaceParams,
  GrepReplaceMatch,
  GrepReplaceToolResult,
} from './types.js'

// Input validation
export const validateInput = (params: GrepReplaceToolParams): ValidatedGrepReplaceParams => {
  if (!params.pathPattern || typeof params.pathPattern !== 'string') {
    throw new Error('pathPattern is required and must be a string')
  }

  if (!params.contentPattern || typeof params.contentPattern !== 'string') {
    throw new Error('contentPattern is required and must be a string')
  }

  if (params.replacement === undefined || typeof params.replacement !== 'string') {
    throw new Error('replacement is required and must be a string')
  }

  if (params.pathPattern.trim() === '') {
    throw new Error('pathPattern cannot be empty')
  }

  if (params.contentPattern.trim() === '') {
    throw new Error('contentPattern cannot be empty')
  }

  // Test if the regex patterns are valid
  try {
    new RegExp(params.pathPattern)
  } catch (error) {
    throw new Error(`Invalid pathPattern regex: ${error instanceof Error ? error.message : String(error)}`)
  }

  try {
    new RegExp(params.contentPattern)
  } catch (error) {
    throw new Error(`Invalid contentPattern regex: ${error instanceof Error ? error.message : String(error)}`)
  }

  return params as ValidatedGrepReplaceParams
}

// Search and replace content within a single file
export const replaceFileContent = async (
  filePath: string,
  relativePath: string,
  contentPattern: RegExp,
  replacement: string,
): Promise<GrepReplaceMatch | undefined> => {
  try {
    const content = await readFile(filePath, 'utf-8')
    let replacementCount = 0

    // Use global flag to replace all occurrences
    const globalPattern = new RegExp(
      contentPattern.source,
      contentPattern.flags.includes('g') ? contentPattern.flags : contentPattern.flags + 'g',
    )

    // Count matches before replacement to track replacements
    const matches = content.match(globalPattern)
    if (!matches || matches.length === 0) {
      return undefined // No matches found
    }

    replacementCount = matches.length

    // Perform the replacement
    const modifiedContent = content.replace(globalPattern, replacement)

    // Only write if content actually changed
    if (modifiedContent !== content) {
      await writeFile(filePath, modifiedContent, 'utf-8')

      return {
        file: relativePath,
        replacementCount,
      }
    }

    return undefined
  } catch {
    // Skip files we can't read/write (binary files, permission issues, etc.)
    // This follows the same pattern as other file-browser tools
    return undefined
  }
}

// Main grep-replace functionality
export const grepReplaceFiles = async (params: ValidatedGrepReplaceParams): Promise<GrepReplaceToolResult> => {
  // Compile regex patterns
  const pathRegex = new RegExp(params.pathPattern)
  const contentRegex = new RegExp(params.contentPattern, 'gm') // global and multiline

  // Collect all replacement results
  const matches: GrepReplaceMatch[] = []
  const uniqueFiles = new Set<string>()
  let totalReplacements = 0

  // Use shared traversal with callback to search and replace in file contents
  await traverseWithCallback({
    pathPattern: pathRegex,
    callback: async (match: TraversalMatch) => {
      // Only process files, not directories
      if (!match.isDirectory) {
        const replaceResult = await replaceFileContent(match.fullPath, match.path, contentRegex, params.replacement)

        if (replaceResult) {
          matches.push(replaceResult)
          uniqueFiles.add(replaceResult.file)
          totalReplacements += replaceResult.replacementCount
        }
      }
    },
  })

  return {
    matches,
    totalReplacements,
    filesModified: Array.from(uniqueFiles).sort(),
  }
}
