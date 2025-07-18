/**
 * Extended Notion API types based on @notionhq/client
 * Adds SQL-specific extensions and simplified response formats
 */

import type { QueryDatabaseParameters, RichTextItemResponse } from '@notionhq/client/build/src/api-endpoints.js'

// Extended database query parameters with SQL-specific options
export interface ExtendedQueryDatabaseParameters extends QueryDatabaseParameters {
  sql_context?: {
    original_sql: string
    operation: string
    columns?: string[]
    simplified_response?: boolean
  }
}

// Simplified property value types (flattened from Notion's nested structure)
export type NotionPropertyValue =
  | TitleProperty
  | RichTextProperty
  | NumberProperty
  | CheckboxProperty
  | SelectProperty
  | MultiSelectProperty
  | DateProperty
  | PeopleProperty
  | RelationProperty
  | URLProperty
  | EmailProperty
  | PhoneProperty
  | FilesProperty
  | FormulaProperty
  | RollupProperty
  | UniqueIdProperty
  | StatusProperty

// Individual property type definitions (matching official Notion types)
export interface TitleProperty {
  type: 'title'
  title: RichTextItemResponse[]
}

export interface RichTextProperty {
  type: 'rich_text'
  rich_text: RichTextItemResponse[]
}

export interface NumberProperty {
  type: 'number'
  number: number | undefined
}

export interface CheckboxProperty {
  type: 'checkbox'
  checkbox: boolean
}

export interface SelectProperty {
  type: 'select'
  select:
    | {
        id?: string
        name?: string
        color?: string
      }
    | undefined
}

export interface MultiSelectProperty {
  type: 'multi_select'
  multi_select: Array<{
    id?: string
    name?: string
    color?: string
  }>
}

export interface DateProperty {
  type: 'date'
  date:
    | {
        start: string
        end?: string
        time_zone?: string
      }
    | undefined
}

export interface PeopleProperty {
  type: 'people'
  people: Array<{
    object: 'user'
    id: string
    name?: string
    avatar_url?: string
    type?: string
    person?: {
      email?: string
    }
  }>
}

export interface RelationProperty {
  type: 'relation'
  relation: Array<{
    id: string
  }>
}

export interface URLProperty {
  type: 'url'
  url: string | undefined
}

export interface EmailProperty {
  type: 'email'
  email: string | undefined
}

export interface PhoneProperty {
  type: 'phone_number'
  phone_number: string | undefined
}

export interface FilesProperty {
  type: 'files'
  files: Array<{
    name: string
    type?: 'external' | 'file'
    external?: {
      url: string
    }
    file?: {
      url: string
      expiry_time: string
    }
  }>
}

export interface FormulaProperty {
  type: 'formula'
  formula: {
    type: 'string' | 'number' | 'boolean' | 'date'
    string?: string
    number?: number
    boolean?: boolean
    date?: {
      start: string
      end?: string
      time_zone?: string
    }
  }
}

export interface RollupProperty {
  type: 'rollup'
  rollup: {
    type: 'number' | 'date' | 'array' | 'unsupported'
    number?: number
    date?: {
      start: string
      end?: string
      time_zone?: string
    }
    array?: NotionPropertyValue[]
    function: string
  }
}

export interface UniqueIdProperty {
  type: 'unique_id'
  unique_id: {
    number: number
    prefix?: string
  }
}

export interface StatusProperty {
  type: 'status'
  status:
    | {
        id?: string
        name?: string
        color?: string
      }
    | undefined
}

// Property type inference helpers
export type PropertyType = NotionPropertyValue['type']

export interface PropertyTypeMapping {
  title: string
  rich_text: string
  number: number
  checkbox: boolean
  select: string
  multi_select: string[]
  date: string
  people: string[]
  relation: string[]
  url: string
  email: string
  phone_number: string
  files: string[]
  formula: unknown
  rollup: unknown
  unique_id: string
  status: string
}

// Filter types extending official Notion filter types
export interface NotionFilter {
  property?: string
  timestamp?: 'created_time' | 'last_edited_time'
  _special?: 'archived' // Custom extension for ARCHIVED property

  // Standard property filters
  title?: TextFilter
  rich_text?: TextFilter
  number?: NumberFilter
  checkbox?: CheckboxFilter
  select?: SelectFilter
  multi_select?: MultiSelectFilter
  date?: DateFilter
  people?: PeopleFilter
  relation?: RelationFilter
  url?: TextFilter
  email?: TextFilter
  phone_number?: TextFilter
  files?: FilesFilter
  formula?: FormulaFilter
  rollup?: RollupFilter
  status?: SelectFilter

  // System property filters
  created_time?: DateFilter
  last_edited_time?: DateFilter

  // Custom condition for archived property
  condition?: { equals: boolean }

  // Logical operators
  and?: NotionFilter[]
  or?: NotionFilter[]
}

// Filter condition types (based on official Notion API)
export interface TextFilter {
  equals?: string
  does_not_equal?: string
  contains?: string
  does_not_contain?: string
  starts_with?: string
  ends_with?: string
  is_empty?: true
  is_not_empty?: true
}

export interface NumberFilter {
  equals?: number
  does_not_equal?: number
  greater_than?: number
  less_than?: number
  greater_than_or_equal_to?: number
  less_than_or_equal_to?: number
  is_empty?: true
  is_not_empty?: true
}

export interface CheckboxFilter {
  equals?: boolean
  does_not_equal?: boolean
}

export interface SelectFilter {
  equals?: string
  does_not_equal?: string
  is_empty?: true
  is_not_empty?: true
}

export interface MultiSelectFilter {
  contains?: string
  does_not_contain?: string
  is_empty?: true
  is_not_empty?: true
}

export interface DateFilter {
  equals?: string
  before?: string
  after?: string
  on_or_before?: string
  on_or_after?: string
  is_empty?: true
  is_not_empty?: true
  past_week?: Record<string, never>
  past_month?: Record<string, never>
  past_year?: Record<string, never>
  next_week?: Record<string, never>
  next_month?: Record<string, never>
  next_year?: Record<string, never>
  this_week?: Record<string, never>
}

export interface PeopleFilter {
  contains?: string
  does_not_contain?: string
  is_empty?: true
  is_not_empty?: true
}

export interface RelationFilter {
  contains?: string
  does_not_contain?: string
  is_empty?: true
  is_not_empty?: true
}

export interface FilesFilter {
  is_empty?: true
  is_not_empty?: true
}

export interface FormulaFilter {
  string?: TextFilter
  checkbox?: CheckboxFilter
  number?: NumberFilter
  date?: DateFilter
}

export interface RollupFilter {
  any?: NotionFilter
  every?: NotionFilter
  none?: NotionFilter
  date?: DateFilter
  number?: NumberFilter
}

// Sort types (based on official Notion API)
export interface NotionSort {
  property?: string
  timestamp?: 'created_time' | 'last_edited_time'
  direction: 'ascending' | 'descending'
}

// Database schema types for DESCRIBE operations
export interface DatabaseSchema {
  id: string
  title: string
  description?: string
  icon?: {
    type: 'emoji' | 'external' | 'file'
    emoji?: string
    external?: { url: string }
    file?: { url: string }
  }
  cover?: {
    type: 'external' | 'file'
    external?: { url: string }
    file?: { url: string }
  }
  properties: Record<string, DatabasePropertySchema>
  is_inline: boolean
  archived: boolean
  created_time: string
  last_edited_time: string
  url: string
}

export interface DatabasePropertySchema {
  id: string
  name: string
  type: PropertyType
  description?: string

  // Type-specific configurations
  title?: Record<string, never>
  rich_text?: Record<string, never>
  number?: {
    format:
      | 'number'
      | 'number_with_commas'
      | 'percent'
      | 'dollar'
      | 'canadian_dollar'
      | 'euro'
      | 'pound'
      | 'yen'
      | 'ruble'
      | 'rupee'
      | 'won'
      | 'yuan'
      | 'real'
      | 'lira'
      | 'rupiah'
      | 'franc'
      | 'hong_kong_dollar'
      | 'new_zealand_dollar'
      | 'krona'
      | 'norwegian_krone'
      | 'mexican_peso'
      | 'rand'
      | 'new_taiwan_dollar'
      | 'danish_krone'
      | 'zloty'
      | 'baht'
      | 'forint'
      | 'koruna'
      | 'shekel'
      | 'chilean_peso'
      | 'philippine_peso'
      | 'dirham'
      | 'colombian_peso'
      | 'riyal'
      | 'ringgit'
      | 'leu'
      | 'argentine_peso'
      | 'uruguayan_peso'
  }
  select?: {
    options: Array<{
      id: string
      name: string
      color: string
    }>
  }
  multi_select?: {
    options: Array<{
      id: string
      name: string
      color: string
    }>
  }
  date?: {
    format: string
  }
  people?: Record<string, never>
  files?: Record<string, never>
  checkbox?: Record<string, never>
  url?: Record<string, never>
  email?: Record<string, never>
  phone_number?: Record<string, never>
  formula?: {
    expression: string
  }
  relation?: {
    database_id: string
    type: 'single_property' | 'dual_property'
    single_property?: Record<string, never>
    dual_property?: {
      synced_property_name: string
      synced_property_id: string
    }
  }
  rollup?: {
    relation_property_name: string
    relation_property_id: string
    rollup_property_name: string
    rollup_property_id: string
    function:
      | 'count'
      | 'count_values'
      | 'count_unique_values'
      | 'count_empty'
      | 'count_not_empty'
      | 'percent_empty'
      | 'percent_not_empty'
      | 'sum'
      | 'average'
      | 'median'
      | 'min'
      | 'max'
      | 'range'
      | 'earliest_date'
      | 'latest_date'
      | 'date_range'
      | 'checked'
      | 'unchecked'
      | 'percent_checked'
      | 'percent_unchecked'
  }
  unique_id?: {
    prefix?: string
  }
  status?: {
    options: Array<{
      id: string
      name: string
      color: string
    }>
    groups: Array<{
      id: string
      name: string
      color: string
      option_ids: string[]
    }>
  }
}
