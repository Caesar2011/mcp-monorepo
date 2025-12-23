import {
  type BlockObjectResponse,
  type DatabaseObjectResponse,
  type DataSourceObjectResponse,
  type PageObjectResponse,
} from '@notionhq/client/build/src/api-endpoints.js'

import { notionToMarkdown } from './markdown-converter.js'

type SelectPropertyResponse = (DataSourceObjectResponse['properties'][string] & {
  type: 'select'
})['select']['options'][number]

/**
 * Formats a single Notion page property into a readable string based on its type [2].
 * @param name - The name of the property.
 * @param prop - The property value object from the Notion API.
 * @returns A formatted string representing the property's value.
 */
function formatPageProperty(name: string, prop: PageObjectResponse['properties'][string]): string {
  let value: string | number | null | undefined = 'Unsupported type'

  switch (prop.type) {
    case 'title':
      value = prop.title.map((t) => t.plain_text).join('')
      break
    case 'rich_text':
      value = prop.rich_text.map((t) => t.plain_text).join('')
      break
    case 'number':
      value = prop.number
      break
    case 'select':
      value = prop.select?.name
      break
    case 'multi_select':
      value = prop.multi_select.map((s) => s.name).join(', ')
      break
    case 'status':
      value = prop.status?.name
      break
    case 'date':
      if (prop.date) {
        value = prop.date.end ? `${prop.date.start} -> ${prop.date.end}` : prop.date.start
      } else {
        value = undefined
      }
      break
    case 'people':
      value = prop.people.map((p) => ('name' in p ? p.name : p.id)).join(', ')
      break
    case 'files':
      value = prop.files.map((f) => f.name).join(', ')
      break
    case 'checkbox':
      value = prop.checkbox ? 'Yes' : 'No'
      break
    case 'url':
      value = prop.url
      break
    case 'email':
      value = prop.email
      break
    case 'phone_number':
      value = prop.phone_number
      break
    case 'formula': {
      const { formula } = prop
      if (formula.type === 'string') value = formula.string
      if (formula.type === 'number') value = formula.number
      if (formula.type === 'boolean') value = formula.boolean ? 'Yes' : 'No'
      if (formula.type === 'date') value = formula.date?.start
      break
    }
    case 'relation':
      value = `${prop.relation.length} relation(s)`
      break
    case 'created_time':
      value = new Date(prop.created_time).toLocaleString()
      break
    case 'last_edited_time':
      value = new Date(prop.last_edited_time).toLocaleString()
      break
    case 'created_by':
      value = 'id' in prop.created_by ? prop.created_by.id : ''
      break
    case 'last_edited_by':
      value = 'id' in prop.last_edited_by ? prop.last_edited_by.id : ''
      break
    case 'rollup': {
      const rollup = prop.rollup
      if (rollup.type === 'number') value = rollup.number
      else if (rollup.type === 'date') value = rollup.date?.start
      else if (rollup.type === 'array') value = `${rollup.array.length} items`
      else value = `Unsupported rollup type`
      break
    }
    case 'unique_id':
      value = prop.unique_id.prefix ? `${prop.unique_id.prefix}-${prop.unique_id.number}` : `${prop.unique_id.number}`
      break
  }

  // eslint-disable-next-line no-restricted-syntax
  return `- **${name}**: ${value ?? 'null'}`
}
/**
 * Formats a Notion Page object and its content into a single Markdown string [5].
 * @param page - The fetched Page object from the Notion API.
 * @param blocks - The content blocks of the page.
 * @returns A promise that resolves to a comprehensive Markdown string representing the page.
 */
export async function formatPageToMarkdown(page: PageObjectResponse, blocks: BlockObjectResponse[]): Promise<string> {
  const contentMarkdown = await notionToMarkdown(blocks)
  const propertiesMarkdown = Object.entries(page.properties)
    .map(([name, prop]) => formatPageProperty(name, prop))
    .join('\n')

  const icon = page.icon?.type === 'emoji' ? `${page.icon.emoji} ` : ''

  return `
# ${icon}Page: ${page.url}

## Properties
${propertiesMarkdown}

## Content
---
${contentMarkdown}
  `.trim()
}

/**
 * Formats a Notion Database object and its data sources into a Markdown string that describes its schemas [10].
 * @param database - The fetched Database object from the Notion API.
 * @param data_sources - An array of fetched Data Source objects belonging to the database.
 * @returns A promise that resolves to a Markdown string representing the database and its data source schemas.
 */
export async function formatDatabaseToMarkdown(
  database: DatabaseObjectResponse,
  data_sources: DataSourceObjectResponse[],
): Promise<string> {
  const title = database.title.map((t) => t.plain_text).join('')
  const icon = database.icon?.type === 'emoji' ? `${database.icon.emoji} ` : ''

  const dataSourcesMarkdown = data_sources
    .map((ds) => {
      const dsTitle = ds.title.map((t) => t.plain_text).join('')
      const propertiesMarkdown = Object.entries(ds.properties)
        .map(([name, prop]) => {
          let details = `(type: \`${prop.type}\`, id: \`${prop.id}\`)`
          let options: SelectPropertyResponse[] = []

          // For select, multi_select, and status, list the available options [13].
          if (prop.type === 'select') {
            options = prop.select.options
          } else if (prop.type === 'multi_select') {
            options = prop.multi_select.options
          } else if (prop.type === 'status') {
            options = prop.status.options
          }

          if (options.length > 0) {
            const optionsString = options.map((o) => o.name).join(', ')
            details += `\n    - Options: ${optionsString}`
          }

          return `  - **${name}** ${details}`
        })
        .join('\n')

      return `
### Data Source: ${dsTitle}
> To query this data source, use its URL: collection://${ds.id}

**Schema / Properties:**
${propertiesMarkdown}
      `.trim()
    })
    .join('\n\n')

  return `
# ${icon}Database: ${title}
> To query pages from this database, use one of the data source URLs below.

${dataSourcesMarkdown}
  `.trim()
}
