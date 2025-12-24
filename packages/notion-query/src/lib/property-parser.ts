import { logger } from '@mcp-monorepo/shared'
import { type CreatePageParameters, type UpdatePageParameters } from '@notionhq/client'
import { type DataSourceObjectResponse } from '@notionhq/client/build/src/api-endpoints.js'

type DataSourceSchema = DataSourceObjectResponse['properties']
type NotionProperties = CreatePageParameters['properties']

/**
 * Parses a flat properties object from the 'create-pages' tool input
 * into the format required by the Notion API.
 *
 * It uses the data source schema to correctly format each property
 * according to its type (e.g., number, select, date) [11].
 *
 * @param properties - A flat key-value map of properties from the tool input [1].
 * @param dataSourceSchema - The schema of the parent data source, used to determine property types [6].
 * @returns A Notion `CreatePageParameters['properties']` object ready for the API [9].
 */
export function parsePropertiesForCreate(
  properties: Record<string, string | number | boolean | null>,
  dataSourceSchema?: DataSourceSchema,
): NotionProperties {
  const notionProperties: NotionProperties = {}

  // Find the name of the 'title' property from the schema, if it exists [11].
  const titleSchemaKey = dataSourceSchema
    ? Object.keys(dataSourceSchema).find((key) => dataSourceSchema[key]?.type === 'title')
    : 'title'

  for (const [key, value] of Object.entries(properties)) {
    // eslint-disable-next-line no-restricted-syntax -- User input
    if (value === null || value === undefined) continue

    // For convenience, allow 'title' as a key and map it to the actual title property name [1].
    if (key.toLowerCase() === 'title' && titleSchemaKey) {
      notionProperties[titleSchemaKey] = {
        title: [{ text: { content: String(value) } }],
      }
      continue
    }

    // If no schema is available (e.g., for a workspace page), only the 'title' is valid [9].
    if (!dataSourceSchema) {
      if (key.toLowerCase() === 'title') {
        notionProperties[key] = { title: [{ text: { content: String(value) } }] }
      } else {
        logger.warn(`Skipping property "${key}"; only 'title' is allowed for pages not in a database.`)
      }
      continue
    }

    const schema = dataSourceSchema[key]
    if (!schema) {
      logger.warn(`Skipping property "${key}" as it was not found in the data source schema.`)
      continue
    }

    // Format the property based on its type from the schema [11].
    switch (schema.type) {
      case 'title':
        notionProperties[key] = { title: [{ text: { content: String(value) } }] }
        break
      case 'rich_text':
        notionProperties[key] = { rich_text: [{ text: { content: String(value) } }] }
        break
      case 'number':
        notionProperties[key] = { number: Number(value) }
        break
      case 'select':
        notionProperties[key] = { select: { name: String(value) } }
        break
      case 'status':
        notionProperties[key] = { status: { name: String(value) } }
        break
      case 'multi_select':
        notionProperties[key] = {
          multi_select: String(value)
            .split(',')
            .map((name) => ({ name: name.trim() })),
        }
        break
      case 'date':
        notionProperties[key] = { date: { start: String(value) } }
        break
      case 'checkbox': {
        const lowerValue = String(value).toLowerCase()
        const boolValue = lowerValue === 'true' || lowerValue === 'yes' || value === 1 || value === true
        notionProperties[key] = { checkbox: boolValue }
        break
      }
      case 'url':
        notionProperties[key] = { url: String(value) }
        break
      case 'email':
        notionProperties[key] = { email: String(value) }
        break
      case 'phone_number':
        notionProperties[key] = { phone_number: String(value) }
        break
      // Advanced types like relation, people, and files are complex and would require
      // more specific input formats than string/number, often needing IDs.
      // They are omitted here but can be extended if the tool input is enhanced.
      case 'relation':
      case 'people':
      case 'files':
      default:
        logger.warn(`Unsupported property type "${schema.type}" for key "${key}" during creation.`)
        break
    }
  }

  return notionProperties
}

/**
 * Parses a flat properties object with special keys (e.g., 'date:deadline:start')
 * from the 'update-page' tool input into the format required by the Notion API.
 * @param properties - A flat key-value map with special-cased keys.
 * @returns A Notion `UpdatePageParameters['properties']` object.
 */
export function parsePropertiesForUpdate(
  _properties: Record<string, string | number>,
): UpdatePageParameters['properties'] {
  // This function would contain the complex logic to handle formats like:
  // "date:deadline:start", "place:office:name", "__YES__" for checkboxes etc.
  // It is a placeholder for now.
  logger.warn('parsePropertiesForUpdate is a skeleton and not fully implemented.')
  return {}
}
