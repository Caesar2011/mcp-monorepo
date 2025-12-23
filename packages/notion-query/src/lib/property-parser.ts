import { logger } from '@mcp-monorepo/shared'
import { type CreatePageParameters, type UpdatePageParameters } from '@notionhq/client'

/**
 * Parses a flat properties object from the 'create-pages' tool input
 * into the format required by the Notion API. This is a crucial translation layer.
 * A full implementation requires fetching the database schema to know the type
 * of each property. This skeleton handles the 'title' property.
 * @param properties - A flat key-value map of properties.
 * @param databaseSchema - The schema of the parent database, if any.
 * @returns A Notion `CreatePageParameters['properties']` object.
 */
export function parsePropertiesForCreate(
  properties: Record<string, string | number>,
  databaseSchema?: Record<string, unknown>,
): CreatePageParameters['properties'] {
  const notionProperties: CreatePageParameters['properties'] = {}

  // In a real implementation, we would look up the title property name from the schema.
  // For now, we assume a property named 'title' is the title.
  const titleKey = Object.keys(properties).find((k) => k.toLowerCase() === 'title') ?? 'Name'
  const titleValue = properties[titleKey]

  if (typeof titleValue === 'string') {
    notionProperties[titleKey] = {
      title: [{ text: { content: titleValue } }],
    }
  }

  // TODO: Implement parsing for other property types (rich_text, number, select, etc.)
  // by checking the `databaseSchema` for property types.
  // for (const [key, value] of Object.entries(properties)) { ... }

  return notionProperties
}

/**
 * Parses a flat properties object with special keys (e.g., 'date:deadline:start')
 * from the 'update-page' tool input into the format required by the Notion API.
 * @param properties - A flat key-value map with special-cased keys.
 * @returns A Notion `UpdatePageParameters['properties']` object.
 */
export function parsePropertiesForUpdate(
  properties: Record<string, string | number>,
): UpdatePageParameters['properties'] {
  // This function would contain the complex logic to handle formats like:
  // "date:deadline:start", "place:office:name", "__YES__" for checkboxes etc.
  // It is a placeholder for now.
  logger.warn('parsePropertiesForUpdate is a skeleton and not fully implemented.')
  return {}
}
