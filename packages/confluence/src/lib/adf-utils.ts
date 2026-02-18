/**
 * Utility functions for converting between Atlassian Document Format (ADF) and Markdown
 * Confluence v2 uses the same ADF format as Jira v3
 */

import { logger } from '@mcp-monorepo/shared'
import { type ADFDocument, AdfToMarkdownEngine, MarkdownToAdfEngine } from 'extended-markdown-adf-parser'

const adfToMarkdownEngine = new AdfToMarkdownEngine()
const markdownToAdfEngine = new MarkdownToAdfEngine()

/**
 * Convert ADF to Markdown string
 * Returns undefined if input is undefined, empty string if conversion fails
 */
export function adfToMd(adf: ADFDocument | string | undefined): string | undefined {
  if (!adf) return undefined
  if (typeof adf === 'string') return adf // Already a string (v1 format)

  try {
    return adfToMarkdownEngine.convert(adf)
  } catch (error) {
    logger.error('Failed to convert ADF to Markdown:', error)
    return '' // Return empty string on error
  }
}

/**
 * Convert Markdown string to ADF
 * Returns undefined if input is undefined
 */
export function mdToAdf(markdown: string | undefined): ADFDocument | undefined {
  if (!markdown) return undefined

  try {
    return markdownToAdfEngine.convert(markdown) as ADFDocument
  } catch (error) {
    logger.error('Failed to convert Markdown to ADF:', error)
    return undefined
  }
}

/**
 * Check if a value is an ADF object
 */
export function isAdf(value: unknown): value is ADFDocument {
  return (
    typeof value === 'object' &&
    // eslint-disable-next-line no-restricted-syntax
    value != null &&
    'type' in value &&
    value.type === 'doc' &&
    'version' in value &&
    'content' in value
  )
}

export type { ADFDocument }
