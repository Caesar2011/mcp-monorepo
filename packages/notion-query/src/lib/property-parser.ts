import { logger } from '@mcp-monorepo/shared'
import { type CreatePageParameters, type UpdatePageParameters } from '@notionhq/client'
import { type DataSourceObjectResponse } from '@notionhq/client/build/src/api-endpoints.js'

type DataSourceSchema = DataSourceObjectResponse['properties']
type NotionProperties = CreatePageParameters['properties']
type NotionUpdateProperties = UpdatePageParameters['properties']

/**
 * Parses a flat properties object from the 'create-pages' tool input
 * into the format required by the Notion API.
 * @param properties - A flat key-value map of properties from the tool input.
 * @param dataSourceSchema - The schema of the parent data source.
 * @returns A Notion `CreatePageParameters['properties']` object.
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
 * @param properties - A flat key-value map with special-cased keys from the tool input [1].
 * @param schema - The schema of the data source the page belongs to.
 * @returns A Notion `NotionUpdateProperties` object.
 */
export function parsePropertiesForUpdate(
  properties: Record<string, string | number | boolean | null>,
  schema: DataSourceSchema,
): NotionUpdateProperties {
  const notionProperties: NotionUpdateProperties = {}
  const groupedComplexProps: Record<
    string,
    | {
        type: 'date'
        data: {
          start: string
          end?: string | null
        }
      }
    | {
        type: 'place'
        data: {
          latitude: number
          longitude: number
          name?: string
          address?: string
          google_place_id?: string
        }
      }
  > = {}

  // 1. Group complex, colon-separated properties like 'date' and 'place' [1].
  for (const [key, value] of Object.entries(properties)) {
    const parts = key.split(':')
    if (parts.length > 1 && (parts[0] === 'date' || parts[0] === 'place')) {
      const [type, propName, ...rest] = parts
      const part = rest.join(':') // Join the rest in case property name has a colon
      if (!groupedComplexProps[propName]) {
        groupedComplexProps[propName] = { type: type as 'date' | 'place', data: {} as never }
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      groupedComplexProps[propName].data[part] = value
    }
  }

  // 2. Process grouped complex properties
  for (const [name, { type, data }] of Object.entries(groupedComplexProps)) {
    if (type === 'date') {
      const dateObj: { start: string; end?: string | null } = { start: data.start }
      if (data.end) dateObj.end = data.end
      // eslint-disable-next-line
      notionProperties[name] = { date: data.start === null ? null : dateObj }
    } else if (type === 'place') {
      // For a place to be valid, latitude and longitude are required [11].
      if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        const placeObj: { lat: number; lon: number; name?: string; address?: string; google_place_id?: string } = {
          lat: data.latitude,
          lon: data.longitude,
        }
        if (data.name) placeObj.name = String(data.name)
        if (data.address) placeObj.address = String(data.address)
        if (data.google_place_id) placeObj.google_place_id = String(data.google_place_id)

        notionProperties[name] = { place: placeObj }
      } else {
        logger.warn(`Skipping place property "${name}" due to missing or invalid latitude/longitude.`)
      }
    }
  }

  // 3. Process simple and standard properties
  for (const [name, value] of Object.entries(properties)) {
    if (name.includes(':')) continue // Skip keys already processed in the grouping step.

    const propSchema = schema[name]
    const propType = propSchema?.type ?? (name.toLowerCase() === 'title' ? 'title' : undefined)

    if (!propType) {
      logger.warn(`Could not determine type for property "${name}". Skipping update.`)
      continue
    }

    /* eslint-disable no-restricted-syntax */
    switch (propType) {
      case 'title':
        notionProperties[name] = { title: [{ text: { content: String(value) } }] }
        break
      case 'rich_text':
        notionProperties[name] = { rich_text: [{ text: { content: String(value ?? '') } }] }
        break
      case 'number':
        notionProperties[name] = { number: value === null ? null : Number(value) }
        break
      case 'select':
        notionProperties[name] = { select: value === null ? null : { name: String(value) } }
        break
      case 'status':
        notionProperties[name] = { status: value === null ? null : { name: String(value) } }
        break
      case 'checkbox': {
        const boolValue = String(value).toLowerCase() === '__yes__' || String(value).toLowerCase() === 'true'
        notionProperties[name] = { checkbox: boolValue }
        break
      }
      case 'url':
        notionProperties[name] = { url: value === null ? null : String(value) }
        break
      case 'email':
        notionProperties[name] = { email: value === null ? null : String(value) }
        break
      case 'phone_number':
        notionProperties[name] = { phone_number: value === null ? null : String(value) }
        break
      default:
        if (!Object.keys(groupedComplexProps).includes(name)) {
          logger.warn(`Updates for property type "${propType}" are not supported. Skipping "${name}".`)
        }
        break
    }
    /* eslint-enable no-restricted-syntax */
  }

  return notionProperties
}
