/**
 * Property type converters for bidirectional SQL ↔ Notion conversion
 * Handles all 20+ Notion property types with type inference and validation
 */

import { TYPE_INFERENCE_PATTERNS } from '../utils/constants.js'
import { PropertyValidationError, TypeMismatchError } from '../utils/error-handling.js'
import { validatePropertyValue, inferPropertyType } from '../utils/validation.js'

import type {
  PropertyType,
  NotionPropertyValue,
  SimplifiedPropertyValue,
  TitleProperty,
  RichTextProperty,
  NumberProperty,
  CheckboxProperty,
  SelectProperty,
  MultiSelectProperty,
  DateProperty,
  PeopleProperty,
  RelationProperty,
  URLProperty,
  EmailProperty,
  PhoneProperty,
  FilesProperty,
  FormulaProperty,
  RollupProperty,
  StatusProperty,
} from '../types/index.js'

/**
 * Convert SQL value to Notion property format
 */
export function convertSQLValueToNotionProperty(
  value: SimplifiedPropertyValue,
  propertyType: PropertyType,
  propertyName: string,
): NotionPropertyValue {
  // Validate the value against expected type
  validatePropertyValue(value, propertyType, propertyName)

  // Handle null values
  if (value === null || value === undefined) {
    return createEmptyProperty(propertyType)
  }

  switch (propertyType) {
    case 'title':
      return convertToTitleProperty(value as string)

    case 'rich_text':
      return convertToRichTextProperty(value as string)

    case 'number':
      return convertToNumberProperty(value as number)

    case 'checkbox':
      return convertToCheckboxProperty(value as boolean)

    case 'select':
      return convertToSelectProperty(value as string)

    case 'multi_select':
      return convertToMultiSelectProperty(value as string[])

    case 'date':
      return convertToDateProperty(value as string)

    case 'people':
      return convertToPeopleProperty(value as string[])

    case 'relation':
      return convertToRelationProperty(value as string[])

    case 'url':
      return convertToURLProperty(value as string)

    case 'email':
      return convertToEmailProperty(value as string)

    case 'phone_number':
      return convertToPhoneProperty(value as string)

    case 'files':
      return convertToFilesProperty(value as string[])

    case 'status':
      return convertToStatusProperty(value as string)

    case 'formula':
    case 'rollup':
    case 'unique_id':
      throw new PropertyValidationError(
        `Cannot set value for read-only property '${propertyName}' of type ${propertyType}`,
        propertyName,
        value,
      )

    default:
      throw new TypeMismatchError(propertyName, propertyType, typeof value, value)
  }
}

/**
 * Convert Notion property to simplified SQL value
 */
export function convertNotionPropertyToSQLValue(
  property: NotionPropertyValue,
  propertyName: string,
): SimplifiedPropertyValue {
  if (!property) {
    return null
  }

  switch (property.type) {
    case 'title':
      return extractTitleValue(property as TitleProperty)

    case 'rich_text':
      return extractRichTextValue(property as RichTextProperty)

    case 'number':
      return extractNumberValue(property as NumberProperty)

    case 'checkbox':
      return extractCheckboxValue(property as CheckboxProperty)

    case 'select':
      return extractSelectValue(property as SelectProperty)

    case 'multi_select':
      return extractMultiSelectValue(property as MultiSelectProperty)

    case 'date':
      return extractDateValue(property as DateProperty)

    case 'people':
      return extractPeopleValue(property as PeopleProperty)

    case 'relation':
      return extractRelationValue(property as RelationProperty)

    case 'url':
      return extractURLValue(property as URLProperty)

    case 'email':
      return extractEmailValue(property as EmailProperty)

    case 'phone_number':
      return extractPhoneValue(property as PhoneProperty)

    case 'files':
      return extractFilesValue(property as FilesProperty)

    case 'formula':
      return extractFormulaValue(property as FormulaProperty)

    case 'rollup':
      return extractRollupValue(property as RollupProperty)

    case 'status':
      return extractStatusValue(property as StatusProperty)

    default:
      console.warn(`Unknown property type: ${(property as any).type}`)
      return null
  }
}

/**
 * Infer property type from SQL value and column name
 */
export function inferNotionPropertyType(value: SimplifiedPropertyValue, columnName?: string): PropertyType {
  return inferPropertyType(value, columnName)
}

/**
 * Create empty property of specified type
 */
function createEmptyProperty(propertyType: PropertyType): NotionPropertyValue {
  switch (propertyType) {
    case 'title':
      return { type: 'title', title: [] }
    case 'rich_text':
      return { type: 'rich_text', rich_text: [] }
    case 'number':
      return { type: 'number', number: undefined }
    case 'checkbox':
      return { type: 'checkbox', checkbox: false }
    case 'select':
      return { type: 'select', select: undefined }
    case 'multi_select':
      return { type: 'multi_select', multi_select: [] }
    case 'date':
      return { type: 'date', date: undefined }
    case 'people':
      return { type: 'people', people: [] }
    case 'relation':
      return { type: 'relation', relation: [] }
    case 'url':
      return { type: 'url', url: undefined }
    case 'email':
      return { type: 'email', email: undefined }
    case 'phone_number':
      return { type: 'phone_number', phone_number: undefined }
    case 'files':
      return { type: 'files', files: [] }
    case 'status':
      return { type: 'status', status: undefined }
    default:
      throw new Error(`Cannot create empty property of type: ${propertyType}`)
  }
}

// Individual property converters (SQL → Notion)
function convertToTitleProperty(value: string): TitleProperty {
  return {
    type: 'title',
    title: [
      {
        type: 'text',
        text: {
          content: value,
          link: null, // Required by @notionhq/client types
        },
        plain_text: value,
        href: null,
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
      },
    ],
  }
}

function convertToRichTextProperty(value: string): RichTextProperty {
  return {
    type: 'rich_text',
    rich_text: [
      {
        type: 'text',
        text: {
          content: value,
          link: null, // Required by @notionhq/client types
        },
        plain_text: value,
        href: null,
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default',
        },
      },
    ],
  }
}

function convertToNumberProperty(value: number): NumberProperty {
  return {
    type: 'number',
    number: value,
  }
}

function convertToCheckboxProperty(value: boolean): CheckboxProperty {
  return {
    type: 'checkbox',
    checkbox: value,
  }
}

function convertToSelectProperty(value: string): SelectProperty {
  return {
    type: 'select',
    select: {
      name: value,
    },
  }
}

function convertToMultiSelectProperty(values: string[]): MultiSelectProperty {
  return {
    type: 'multi_select',
    multi_select: values.map((value) => ({
      name: value,
    })),
  }
}

function convertToDateProperty(value: string): DateProperty {
  // Handle date ranges (e.g., "2023-12-01 -> 2023-12-15")
  if (value.includes(' -> ')) {
    const [start, end] = value.split(' -> ').map((d) => d.trim())
    return {
      type: 'date',
      date: {
        start,
        end,
        time_zone: undefined,
      },
    }
  }

  return {
    type: 'date',
    date: {
      start: value,
      end: undefined,
      time_zone: undefined,
    },
  }
}

function convertToPeopleProperty(values: string[]): PeopleProperty {
  return {
    type: 'people',
    people: values.map((value) => {
      // Remove @ prefix if present
      const cleanValue = value.startsWith('@') ? value.slice(1) : value

      // If it looks like an email, use it directly
      if (TYPE_INFERENCE_PATTERNS.EMAIL.test(cleanValue)) {
        return {
          object: 'user' as const,
          id: cleanValue, // Notion will resolve email to user ID
          type: 'person',
          person: {
            email: cleanValue,
          },
        }
      }

      // Otherwise assume it's a user ID
      return {
        object: 'user' as const,
        id: cleanValue,
        type: 'person',
      }
    }),
  }
}

function convertToRelationProperty(values: string[]): RelationProperty {
  return {
    type: 'relation',
    relation: values.map((value) => ({
      // Remove # prefix if present
      id: value.startsWith('#') ? value.slice(1) : value,
    })),
  }
}

function convertToURLProperty(value: string): URLProperty {
  return {
    type: 'url',
    url: value,
  }
}

function convertToEmailProperty(value: string): EmailProperty {
  return {
    type: 'email',
    email: value,
  }
}

function convertToPhoneProperty(value: string): PhoneProperty {
  return {
    type: 'phone_number',
    phone_number: value,
  }
}

function convertToFilesProperty(values: string[]): FilesProperty {
  return {
    type: 'files',
    files: values.map((value) => ({
      name: extractFilenameFromURL(value),
      type: 'external',
      external: {
        url: value,
      },
    })),
  }
}

function convertToStatusProperty(value: string): StatusProperty {
  return {
    type: 'status',
    status: {
      name: value,
    },
  }
}

// Individual property extractors (Notion → SQL)
function extractTitleValue(property: TitleProperty): string {
  if (!property.title || property.title.length === 0) {
    return ''
  }

  return property.title
    .map((item) => {
      // Handle different RichTextItemResponse types safely
      if (item.type === 'text' && 'text' in item) {
        return item.text?.content || ''
      }
      return item.plain_text || ''
    })
    .join('')
}

function extractRichTextValue(property: RichTextProperty): string {
  if (!property.rich_text || property.rich_text.length === 0) {
    return ''
  }

  return property.rich_text
    .map((item) => {
      // Handle different RichTextItemResponse types safely
      if (item.type === 'text' && 'text' in item) {
        return item.text?.content || ''
      }
      return item.plain_text || ''
    })
    .join('')
}

function extractNumberValue(property: NumberProperty): number | null {
  return property.number ?? null
}

function extractCheckboxValue(property: CheckboxProperty): boolean {
  return property.checkbox
}

function extractSelectValue(property: SelectProperty): string | null {
  return property.select?.name ?? null
}

function extractMultiSelectValue(property: MultiSelectProperty): string[] {
  if (!property.multi_select) {
    return []
  }

  return property.multi_select.map((item) => item.name).filter((name) => name !== undefined) as string[]
}

function extractDateValue(property: DateProperty): string | null {
  if (!property.date) {
    return null
  }

  // Handle date ranges
  if (property.date.end) {
    return `${property.date.start} -> ${property.date.end}`
  }

  return property.date.start
}

function extractPeopleValue(property: PeopleProperty): string[] {
  if (!property.people) {
    return []
  }

  return property.people.map((person) => {
    // Safely access person properties based on actual API types
    if ('person' in person && person.person?.email) {
      return person.person.email
    }

    // Fall back to user ID
    return person.id
  })
}

function extractRelationValue(property: RelationProperty): string[] {
  if (!property.relation) {
    return []
  }

  return property.relation.map((relation) => relation.id)
}

function extractURLValue(property: URLProperty): string | null {
  return property.url ?? null
}

function extractEmailValue(property: EmailProperty): string | null {
  return property.email ?? null
}

function extractPhoneValue(property: PhoneProperty): string | null {
  return property.phone_number ?? null
}

function extractFilesValue(property: FilesProperty): string[] {
  if (!property.files) {
    return []
  }

  return property.files
    .map((file) => {
      if ('external' in file && file.external?.url) {
        return file.external.url
      }
      if ('file' in file && file.file?.url) {
        return file.file.url
      }
      return file.name || ''
    })
    .filter((url) => url !== '') as string[]
}

function extractFormulaValue(property: FormulaProperty): SimplifiedPropertyValue {
  if (!property.formula) {
    return null
  }

  switch (property.formula.type) {
    case 'string':
      return property.formula.string ?? null
    case 'number':
      return property.formula.number ?? null
    case 'boolean':
      return property.formula.boolean ?? null
    case 'date':
      if (property.formula.date) {
        return property.formula.date.end
          ? `${property.formula.date.start} -> ${property.formula.date.end}`
          : property.formula.date.start
      }
      return null
    default:
      return null
  }
}

function extractRollupValue(property: RollupProperty): SimplifiedPropertyValue {
  if (!property.rollup) {
    return null
  }

  switch (property.rollup.type) {
    case 'number':
      return property.rollup.number ?? null
    case 'date':
      if (property.rollup.date) {
        return property.rollup.date.end
          ? `${property.rollup.date.start} -> ${property.rollup.date.end}`
          : property.rollup.date.start
      }
      return null
    case 'array':
      // Handle array rollups by extracting first level values
      if (property.rollup.array && property.rollup.array.length > 0) {
        const extractedValues = property.rollup.array
          .map((item) => convertNotionPropertyToSQLValue(item, 'rollup_item'))
          .filter((value) => value !== null)
        return extractedValues as SimplifiedPropertyValue
      }
      return []
    default:
      return null
  }
}

function extractStatusValue(property: StatusProperty): string | null {
  return property.status?.name ?? null
}

// Utility functions
function extractFilenameFromURL(url: string): string {
  try {
    const parsedURL = new URL(url)
    const pathname = parsedURL.pathname
    const filename = pathname.split('/').pop() || 'file'
    return decodeURIComponent(filename)
  } catch {
    // If URL parsing fails, use a generic name
    return 'file'
  }
}

/**
 * Batch convert multiple SQL values to Notion properties
 */
export function batchConvertSQLToNotionProperties(
  values: Record<string, SimplifiedPropertyValue>,
  propertyTypes: Record<string, PropertyType>,
): Record<string, NotionPropertyValue> {
  const result: Record<string, NotionPropertyValue> = {}

  for (const [propertyName, value] of Object.entries(values)) {
    const propertyType = propertyTypes[propertyName]

    if (!propertyType) {
      throw new PropertyValidationError(`No property type specified for '${propertyName}'`, propertyName, value)
    }

    result[propertyName] = convertSQLValueToNotionProperty(value, propertyType, propertyName)
  }

  return result
}

/**
 * Batch convert Notion properties to SQL values
 */
export function batchConvertNotionToSQLProperties(
  properties: Record<string, NotionPropertyValue>,
): Record<string, SimplifiedPropertyValue> {
  const result: Record<string, SimplifiedPropertyValue> = {}

  for (const [propertyName, property] of Object.entries(properties)) {
    result[propertyName] = convertNotionPropertyToSQLValue(property, propertyName)
  }

  return result
}

/**
 * Validate property type compatibility
 */
export function validatePropertyTypeCompatibility(
  sqlValue: SimplifiedPropertyValue,
  notionPropertyType: PropertyType,
  propertyName: string,
): boolean {
  try {
    validatePropertyValue(sqlValue, notionPropertyType, propertyName)
    return true
  } catch {
    return false
  }
}
