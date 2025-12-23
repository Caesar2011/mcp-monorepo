import {
  type BlockObjectResponse,
  type RichTextItemResponse,
  type ToDoBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js'
import { NotionToMarkdown } from 'notion-to-md'
import { type CustomTransformer } from 'notion-to-md/build/types/index.js'

import { getNotionClient } from './client.js'

let n2m: NotionToMarkdown | undefined

/**
 * Renders an array of rich text items into a Notion-flavored Markdown string.
 * Supports bold, italic, strikethrough, underline, code, and links [9].
 * @param richTextItems - The array of rich text items.
 * @returns A formatted markdown string.
 */
function renderRichText(richTextItems: RichTextItemResponse[]): string {
  return richTextItems
    .map((item) => {
      let text = item.plain_text

      if (item.href) {
        // Handle citations [^URL] and regular links [text](URL)
        if (text === item.href) {
          return `[^${item.href}]`
        }
        return `[${text}](${item.href})`
      }

      // Handle annotations [6]
      if (item.annotations.code) text = `\`${text}\``
      if (item.annotations.bold) text = `**${text}**`
      if (item.annotations.italic) text = `*${text}*`
      if (item.annotations.strikethrough) text = `~~${text}~~`
      if (item.annotations.underline) text = `<span underline="true">${text}</span>`

      return text
    })
    .join('')
}

/**
 * Gets a pre-configured singleton instance of NotionToMarkdown.
 * Sets up custom transformers for Notion-flavored Markdown [9].
 * @returns An instance of NotionToMarkdown.
 */
function getMarkdownConverter(): NotionToMarkdown {
  if (n2m) {
    return n2m
  }

  const notionClient = getNotionClient()
  n2m = new NotionToMarkdown({ notionClient })

  // A generic transformer for simple blocks with rich_text and color properties [1].
  const createColorBlockTransformer =
    (prefix: string = ''): CustomTransformer =>
    async (block) => {
      const blockContent =
        'type' in block &&
        ((block as never)[block.type] as {
          rich_text: RichTextItemResponse[]
          color: string
        })

      if (!blockContent) {
        return ''
      }

      const markdownContent = renderRichText(blockContent.rich_text)
      let finalMarkdown = `${prefix}${markdownContent}`

      if (blockContent.color && blockContent.color !== 'default') {
        finalMarkdown += ` {color="${blockContent.color}"}`
      }

      return finalMarkdown
    }

  // Register transformers for block types that support color [1, 9].
  n2m.setCustomTransformer('paragraph', createColorBlockTransformer())
  n2m.setCustomTransformer('heading_1', createColorBlockTransformer('# '))
  n2m.setCustomTransformer('heading_2', createColorBlockTransformer('## '))
  n2m.setCustomTransformer('heading_3', createColorBlockTransformer('### '))
  n2m.setCustomTransformer('bulleted_list_item', createColorBlockTransformer('- '))
  n2m.setCustomTransformer('numbered_list_item', createColorBlockTransformer('1. '))
  n2m.setCustomTransformer('quote', createColorBlockTransformer('> '))

  // Custom transformer for to-do blocks to handle the checked state [9].
  n2m.setCustomTransformer('to_do', async (block) => {
    const todoBlock = block as ToDoBlockObjectResponse
    const prefix = todoBlock.to_do.checked ? '- [x] ' : '- [ ] '
    const markdownContent = renderRichText(todoBlock.to_do.rich_text)
    let finalMarkdown = `${prefix}${markdownContent}`
    if (todoBlock.to_do.color && todoBlock.to_do.color !== 'default') {
      finalMarkdown += ` {color="${todoBlock.to_do.color}"}`
    }
    return finalMarkdown
  })

  return n2m
}

/**
 * Converts a list of Notion blocks to a Notion-flavored Markdown string [9].
 * @param blocks - The array of block objects.
 * @returns A promise that resolves to the full Markdown string.
 */
export async function notionToMarkdown(blocks: BlockObjectResponse[]): Promise<string> {
  const converter = getMarkdownConverter()
  // The 'blocks' parameter expects the 'results' from a 'listBlockChildren' call, which matches BlockObjectResponse[]
  const mdBlocks = await converter.blocksToMarkdown(blocks)
  const mdString = converter.toMarkdownString(mdBlocks)
  // `toMarkdownString` returns an object where `parent` holds the main content [7]
  return mdString.parent ?? ''
}
