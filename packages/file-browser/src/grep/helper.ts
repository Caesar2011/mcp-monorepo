import { readFile } from 'fs/promises'

import { traverseWithCallback, type TraversalMatch } from '../lib/traversal.js'

import type { GrepToolParams, ValidatedGrepParams, GrepMatch, GrepToolResult } from './types.js'

// Input validation
export const validateInput = (params: GrepToolParams): ValidatedGrepParams => {
  if (!params.pathPattern || typeof params.pathPattern !== 'string') {
    throw new Error('pathPattern is required and must be a string')
  }

  if (!params.contentPattern || typeof params.contentPattern !== 'string') {
    throw new Error('contentPattern is required and must be a string')
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

  return params as ValidatedGrepParams
}

// Search for content pattern within file content and return matches with context
export const searchFileContent = async (
  filePath: string,
  relativePath: string,
  contentPattern: RegExp,
): Promise<GrepMatch[]> => {
  const matches: GrepMatch[] = []

  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const match = contentPattern.exec(line)

      if (match) {
        // Get 2 lines before and after for context
        const beforeLines: string[] = []
        const afterLines: string[] = []

        // Collect before lines (max 2)
        for (let j = Math.max(0, i - 2); j < i; j++) {
          beforeLines.push(lines[j])
        }

        // Collect after lines (max 2)
        for (let j = i + 1; j <= Math.min(lines.length - 1, i + 2); j++) {
          afterLines.push(lines[j])
        }

        matches.push({
          file: relativePath,
          line: i + 1, // Line numbers are 1-based
          match: line,
          before: beforeLines,
          after: afterLines,
        })

        // Reset regex for global patterns to continue searching from current position
        if (contentPattern.global) {
          contentPattern.lastIndex = 0
        }
      }
    }
  } catch {
    // Skip files we can't read (binary files, permission issues, etc.)
    // This follows the same pattern as other file-browser tools
  }

  return matches
}

// Main grep functionality
export const grepFiles = async (params: ValidatedGrepParams): Promise<GrepToolResult> => {
  // Compile regex patterns
  const pathRegex = new RegExp(params.pathPattern)
  const contentRegex = new RegExp(params.contentPattern, 'gm') // global and multiline

  // Collect all grep matches
  const allMatches: GrepMatch[] = []

  // Use shared traversal with callback to search file contents
  await traverseWithCallback({
    pathPattern: pathRegex,
    maxResults: 30, // Limit to prevent too many results
    callback: async (match: TraversalMatch) => {
      // Only search files, not directories
      if (!match.isDirectory) {
        const fileMatches = await searchFileContent(match.fullPath, match.path, contentRegex)
        allMatches.push(...fileMatches)

        // Stop traversal if we've reached the limit
        if (allMatches.length >= 30) {
          return false // Stop traversal
        }
      }
    },
  })

  // Trim to exactly 30 matches if we have more
  const matches = allMatches.slice(0, 30)
  const totalMatches = matches.length
  const limited = allMatches.length >= 30

  return {
    matches,
    totalMatches,
    limited,
  }
}
