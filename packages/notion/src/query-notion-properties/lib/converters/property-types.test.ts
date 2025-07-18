/**
 * Tests for property type converters
 */

import { describe, expect, test } from 'vitest'

import {
  convertSQLValueToNotionProperty,
  convertNotionPropertyToSQLValue,
  inferNotionPropertyType,
  batchConvertSQLToNotionProperties,
  batchConvertNotionToSQLProperties,
  validatePropertyTypeCompatibility,
} from './property-types.js'
import { type NotionPropertyValue, type PropertyType } from '../types/index.js'

describe('Property Type Converters', () => {
  describe('convertSQLValueToNotionProperty', () => {
    test('should convert string to title property', () => {
      const result = convertSQLValueToNotionProperty('Test Title', 'title', 'Name')

      expect(result.type).toBe('title')
      expect(result.title).toEqual([
        {
          text: {
            content: 'Test Title',
          },
        },
      ])
    })

    test('should convert string to rich text property', () => {
      const result = convertSQLValueToNotionProperty('Test content', 'rich_text', 'Description')

      expect(result.type).toBe('rich_text')
      expect(result.rich_text).toEqual([
        {
          text: {
            content: 'Test content',
          },
        },
      ])
    })

    test('should convert number to number property', () => {
      const result = convertSQLValueToNotionProperty(42, 'number', 'Priority')

      expect(result.type).toBe('number')
      expect(result.number).toBe(42)
    })

    test('should convert boolean to checkbox property', () => {
      const result = convertSQLValueToNotionProperty(true, 'checkbox', 'Completed')

      expect(result.type).toBe('checkbox')
      expect(result.checkbox).toBe(true)
    })

    test('should convert string to select property', () => {
      const result = convertSQLValueToNotionProperty('In Progress', 'select', 'Status')

      expect(result.type).toBe('select')
      expect(result.select).toEqual({ name: 'In Progress' })
    })

    test('should convert array to multi-select property', () => {
      const result = convertSQLValueToNotionProperty(['tag1', 'tag2'], 'multi_select', 'Tags')

      expect(result.type).toBe('multi_select')
      expect(result.multi_select).toEqual([{ name: 'tag1' }, { name: 'tag2' }])
    })

    test('should convert date string to date property', () => {
      const result = convertSQLValueToNotionProperty('2023-12-01', 'date', 'Due Date')

      expect(result.type).toBe('date')
      expect(result.date).toEqual({ start: '2023-12-01' })
    })

    test('should convert date range to date property', () => {
      const result = convertSQLValueToNotionProperty('2023-12-01 -> 2023-12-15', 'date', 'Duration')

      expect(result.type).toBe('date')
      expect(result.date).toEqual({
        start: '2023-12-01',
        end: '2023-12-15',
      })
    })

    test('should convert people array to people property', () => {
      const result = convertSQLValueToNotionProperty(['@john@company.com', 'user-id-123'], 'people', 'Assignee')

      expect(result.type).toBe('people')
      expect(result.people).toEqual([
        {
          object: 'user',
          id: 'john@company.com',
          person: {
            email: 'john@company.com',
          },
        },
        {
          object: 'user',
          id: 'user-id-123',
        },
      ])
    })

    test('should convert relation array to relation property', () => {
      const result = convertSQLValueToNotionProperty(['#page-id-123', 'page-id-456'], 'relation', 'Projects')

      expect(result.type).toBe('relation')
      expect(result.relation).toEqual([{ id: 'page-id-123' }, { id: 'page-id-456' }])
    })

    test('should convert URL string to URL property', () => {
      const result = convertSQLValueToNotionProperty('https://example.com', 'url', 'Website')

      expect(result.type).toBe('url')
      expect(result.url).toBe('https://example.com')
    })

    test('should convert email string to email property', () => {
      const result = convertSQLValueToNotionProperty('user@example.com', 'email', 'Contact')

      expect(result.type).toBe('email')
      expect(result.email).toBe('user@example.com')
    })

    test('should convert phone string to phone property', () => {
      const result = convertSQLValueToNotionProperty('+1-555-123-4567', 'phone_number', 'Phone')

      expect(result.type).toBe('phone_number')
      expect(result.phone_number).toBe('+1-555-123-4567')
    })

    test('should convert file URLs to files property', () => {
      const result = convertSQLValueToNotionProperty(['https://example.com/file.pdf'], 'files', 'Attachments')

      expect(result.type).toBe('files')
      expect(result.files).toEqual([
        {
          name: 'file.pdf',
          external: {
            url: 'https://example.com/file.pdf',
          },
        },
      ])
    })

    test('should handle null values', () => {
      const result = convertSQLValueToNotionProperty(null, 'rich_text', 'Description')

      expect(result.type).toBe('rich_text')
      expect(result.rich_text).toEqual([])
    })

    test('should throw error for read-only properties', () => {
      expect(() => {
        convertSQLValueToNotionProperty(85, 'formula', 'Calculated Score')
      }).toThrow('Cannot set value for read-only property')
    })
  })

  describe('convertNotionPropertyToSQLValue', () => {
    test('should convert title property to string', () => {
      const property: NotionPropertyValue = {
        type: 'title',
        title: [
          {
            text: {
              content: 'Test Title',
            },
          },
        ],
      }

      const result = convertNotionPropertyToSQLValue(property, 'Name')
      expect(result).toBe('Test Title')
    })

    test('should convert rich text property to string', () => {
      const property: NotionPropertyValue = {
        type: 'rich_text',
        rich_text: [
          {
            text: {
              content: 'Test content',
            },
          },
        ],
      }

      const result = convertNotionPropertyToSQLValue(property, 'Description')
      expect(result).toBe('Test content')
    })

    test('should convert number property to number', () => {
      const property: NotionPropertyValue = {
        type: 'number',
        number: 42,
      }

      const result = convertNotionPropertyToSQLValue(property, 'Priority')
      expect(result).toBe(42)
    })

    test('should convert checkbox property to boolean', () => {
      const property: NotionPropertyValue = {
        type: 'checkbox',
        checkbox: true,
      }

      const result = convertNotionPropertyToSQLValue(property, 'Completed')
      expect(result).toBe(true)
    })

    test('should convert select property to string', () => {
      const property: NotionPropertyValue = {
        type: 'select',
        select: {
          name: 'In Progress',
        },
      }

      const result = convertNotionPropertyToSQLValue(property, 'Status')
      expect(result).toBe('In Progress')
    })

    test('should convert multi-select property to array', () => {
      const property: NotionPropertyValue = {
        type: 'multi_select',
        multi_select: [{ name: 'tag1' }, { name: 'tag2' }],
      }

      const result = convertNotionPropertyToSQLValue(property, 'Tags')
      expect(result).toEqual(['tag1', 'tag2'])
    })

    test('should convert date property to string', () => {
      const property: NotionPropertyValue = {
        type: 'date',
        date: {
          start: '2023-12-01',
        },
      }

      const result = convertNotionPropertyToSQLValue(property, 'Due Date')
      expect(result).toBe('2023-12-01')
    })

    test('should convert date range property to range string', () => {
      const property: NotionPropertyValue = {
        type: 'date',
        date: {
          start: '2023-12-01',
          end: '2023-12-15',
        },
      }

      const result = convertNotionPropertyToSQLValue(property, 'Duration')
      expect(result).toBe('2023-12-01 -> 2023-12-15')
    })

    test('should convert people property to email array', () => {
      const property: NotionPropertyValue = {
        type: 'people',
        people: [
          {
            object: 'user',
            id: 'user-123',
            person: {
              email: 'john@company.com',
            },
          },
        ],
      }

      const result = convertNotionPropertyToSQLValue(property, 'Assignee')
      expect(result).toEqual(['john@company.com'])
    })

    test('should convert relation property to ID array', () => {
      const property: NotionPropertyValue = {
        type: 'relation',
        relation: [{ id: 'page-id-123' }, { id: 'page-id-456' }],
      }

      const result = convertNotionPropertyToSQLValue(property, 'Projects')
      expect(result).toEqual(['page-id-123', 'page-id-456'])
    })

    test('should handle empty properties', () => {
      const property: NotionPropertyValue = {
        type: 'rich_text',
        rich_text: [],
      }

      const result = convertNotionPropertyToSQLValue(property, 'Description')
      expect(result).toBe('')
    })
  })

  describe('inferNotionPropertyType', () => {
    test('should infer title from column name', () => {
      const result = inferNotionPropertyType('Some text', 'Name')
      expect(result).toBe('title')
    })

    test('should infer email from value pattern', () => {
      const result = inferNotionPropertyType('user@example.com')
      expect(result).toBe('email')
    })

    test('should infer URL from value pattern', () => {
      const result = inferNotionPropertyType('https://example.com')
      expect(result).toBe('url')
    })

    test('should infer date from value pattern', () => {
      const result = inferNotionPropertyType('2023-12-01')
      expect(result).toBe('date')
    })

    test('should infer number from value type', () => {
      const result = inferNotionPropertyType(42)
      expect(result).toBe('number')
    })

    test('should infer checkbox from boolean value', () => {
      const result = inferNotionPropertyType(true)
      expect(result).toBe('checkbox')
    })

    test('should infer people from @ prefix', () => {
      const result = inferNotionPropertyType(['@user@example.com'])
      expect(result).toBe('people')
    })

    test('should infer relation from # prefix', () => {
      const result = inferNotionPropertyType(['#page-id-123'])
      expect(result).toBe('relation')
    })

    test('should infer multi-select from string array', () => {
      const result = inferNotionPropertyType(['tag1', 'tag2'])
      expect(result).toBe('multi_select')
    })
  })

  describe('batchConvertSQLToNotionProperties', () => {
    test('should convert multiple SQL values to Notion properties', () => {
      const values = {
        Name: 'Test Task',
        Priority: 5,
        Completed: false,
        Tags: ['urgent', 'frontend'],
      }

      const propertyTypes: Record<string, PropertyType> = {
        Name: 'title',
        Priority: 'number',
        Completed: 'checkbox',
        Tags: 'multi_select',
      }

      const result = batchConvertSQLToNotionProperties(values, propertyTypes)

      expect(result.Name.type).toBe('title')
      expect(result.Priority.type).toBe('number')
      expect(result.Completed.type).toBe('checkbox')
      expect(result.Tags.type).toBe('multi_select')
    })

    test('should throw error for missing property type', () => {
      const values = { Name: 'Test' }
      const propertyTypes = {}

      expect(() => {
        batchConvertSQLToNotionProperties(values, propertyTypes)
      }).toThrow('No property type specified')
    })
  })

  describe('batchConvertNotionToSQLProperties', () => {
    test('should convert multiple Notion properties to SQL values', () => {
      const properties: Record<string, NotionPropertyValue> = {
        Name: {
          type: 'title',
          title: [{ text: { content: 'Test Task' } }],
        },
        Priority: {
          type: 'number',
          number: 5,
        },
        Completed: {
          type: 'checkbox',
          checkbox: false,
        },
      }

      const result = batchConvertNotionToSQLProperties(properties)

      expect(result.Name).toBe('Test Task')
      expect(result.Priority).toBe(5)
      expect(result.Completed).toBe(false)
    })
  })

  describe('validatePropertyTypeCompatibility', () => {
    test('should return true for compatible types', () => {
      const result = validatePropertyTypeCompatibility('test@example.com', 'email', 'Contact')
      expect(result).toBe(true)
    })

    test('should return false for incompatible types', () => {
      const result = validatePropertyTypeCompatibility('not a number', 'number', 'Priority')
      expect(result).toBe(false)
    })
  })
})
