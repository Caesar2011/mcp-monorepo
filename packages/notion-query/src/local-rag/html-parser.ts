import { logger } from '@mcp-monorepo/shared'
import { Readability, isProbablyReaderable } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

export async function parseHtmlContent(url: string, htmlContent: string): Promise<string> {
  const doc = new JSDOM(htmlContent, { url })

  // First, check if the page is likely to be readable
  if (!isProbablyReaderable(doc.window.document)) {
    logger.warn(`Page at ${url} is not considered readerable. Falling back to basic parsing.`)
    // Fallback to the naive implementation if not readerable
    return defaultParseHtmlContent(htmlContent)
  }

  const reader = new Readability(doc.window.document)
  const article = reader.parse()

  const textContent = article?.textContent?.trim()
  if (textContent) {
    // Successfully parsed, return the clean text content
    // For Markdown, you would convert article.content here with another library
    return textContent
  } else {
    // Readability failed to parse an article, use the fallback
    logger.warn(`Readability.js could not parse an article from ${url}. Falling back to basic parsing.`)
    return defaultParseHtmlContent(htmlContent)
  }
}

function defaultParseHtmlContent(htmlContent: string): string {
  return htmlContent
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
