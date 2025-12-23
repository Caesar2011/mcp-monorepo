// notion-query/lib/parser.ts

// --- Type Definitions for stricter parsing ---

// Represents the simplified value of a Notion property
import {
  type DataSourceObjectResponse,
  type PageObjectResponse,
  type PartialDataSourceObjectResponse,
  type PartialPageObjectResponse,
} from '@notionhq/client'

type SimplifiedPropertyValue = string | number | boolean | string[] | (string | number | boolean)[] | undefined

// Represents a simplified, flattened Notion Page
type SimplifiedPage = Record<string, SimplifiedPropertyValue>

// Represents a raw Notion property object from the API
// This is a subset for demonstration; a full implementation would be extensive.
interface NotionProperty {
  type: string
  [key: string]: unknown
}

// Represents a raw Page object from the Notion API
type NotionPage =
  | PageObjectResponse
  | PartialPageObjectResponse
  | PartialDataSourceObjectResponse
  | DataSourceObjectResponse

/**
 * Simplifies a single Notion property object into a more readable, simple value.
 * @param prop The Notion property object.
 * @returns A simplified value (string, number, boolean, array, etc.) or undefined.
 */
const simplifyPropertyValue = (prop: NotionProperty): SimplifiedPropertyValue => {
  switch (prop.type) {
    case 'title':
      return (prop.title as { plain_text: string }[]).map((t) => t.plain_text).join('')
    case 'rich_text':
      return (prop.rich_text as { plain_text: string }[]).map((t) => t.plain_text).join('')
    case 'number':
      return prop.number as number
    case 'checkbox':
      return prop.checkbox as boolean
    case 'select':
      return (prop.select as { name: string } | undefined)?.name
    case 'multi_select':
      return (prop.multi_select as { name: string }[]).map((s) => s.name)
    case 'status':
      return (prop.status as { name: string } | undefined)?.name
    case 'date': {
      const date = prop.date as { start: string; end?: string }
      if (!date) return undefined
      return date.end ? `${date.start} to ${date.end}` : date.start
    }
    case 'people':
      return (prop.people as { name?: string; id: string }[]).map((p) => p.name ?? p.id)
    case 'relation':
      return (prop.relation as { id: string }[]).map((r) => r.id)
    case 'formula': {
      const formula = prop.formula as { type: string; [key: string]: unknown }
      return formula[formula.type] as string | number | boolean | undefined
    }
    case 'rollup': {
      const rollup = prop.rollup as { type: string; array?: NotionProperty[]; [key: string]: unknown }
      if (rollup.type === 'array' && rollup.array) {
        return rollup.array.flatMap((item) => simplifyPropertyValue(item)).filter((p) => p !== undefined)
      }
      return rollup[rollup.type] as string | number | undefined
    }
    case 'url':
      return prop.url as string
    case 'email':
      return prop.email as string
    case 'phone_number':
      return prop.phone_number as string
    default:
      return undefined
  }
}

/**
 * Takes an array of Notion page objects from the API and converts them into
 * a simplified, flat array of key-value objects.
 * @param pages The array of page objects from the Notion API response.
 * @returns An array of simplified page objects.
 */
export const simplifyNotionPages = (pages: NotionPage[]): SimplifiedPage[] => {
  return pages.map((page) => {
    const simplifiedPage: SimplifiedPage = {}

    if ('icon' in page) {
      if (page.icon?.type === 'emoji') {
        simplifiedPage.icon = page.icon.emoji
      } else if (page.icon?.type === 'external') {
        simplifiedPage.icon = page.icon.external.url
      }
    }

    if ('cover' in page) {
      if (page.cover?.type === 'external') {
        simplifiedPage.cover = page.cover.external.url
      } else if (page.cover?.type === 'file') {
        simplifiedPage.cover = page.cover.file.url
      }
    }

    simplifiedPage.url = 'url' in page ? page.url : undefined

    if ('properties' in page && page.properties) {
      for (const [propName, propValue] of Object.entries(page.properties)) {
        simplifiedPage[propName] = simplifyPropertyValue(propValue)
      }
    }

    return simplifiedPage
  })
}
