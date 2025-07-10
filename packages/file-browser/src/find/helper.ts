import { collectMatches } from '../lib/traversal.js'

import type { FindToolParams, ValidatedFindParams, FindMatch, FindToolResult } from './types.js'

// Input validation
export const validateInput = (params: FindToolParams): ValidatedFindParams => {
  if (!params.pattern || typeof params.pattern !== 'string') {
    throw new Error('pattern is required and must be a string')
  }

  if (params.pattern.trim() === '') {
    throw new Error('pattern cannot be empty')
  }

  // Test if the regex pattern is valid
  try {
    new RegExp(params.pattern)
  } catch (error) {
    throw new Error(`Invalid regex pattern: ${error instanceof Error ? error.message : String(error)}`)
  }

  return params as ValidatedFindParams
}

// Main find functionality
export const findFiles = async (params: ValidatedFindParams): Promise<FindToolResult> => {
  // Compile regex pattern
  const regex = new RegExp(params.pattern)

  // Use shared traversal to collect matches
  const traversalMatches = await collectMatches(regex)

  // Convert TraversalMatch to FindMatch format
  const matches: FindMatch[] = traversalMatches.map((match) => ({
    path: match.path,
    size: match.size,
    isDirectory: match.isDirectory,
  }))

  return {
    matches,
    totalMatches: matches.length,
  }
}
