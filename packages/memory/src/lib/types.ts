// Core types and interfaces shared across memory tools
export type StorageType = 'short_term' | 'mid_term' | 'long_term'

export interface Memory {
  id: number
  content: string
  category: string
  storage_type: StorageType
  created_at: string
  invalid_after: number | undefined
  created_timestamp: number
}

export interface StoreMemoryArgs {
  memory: string
  category?: string | undefined
}

export interface RemoveMemoryArgs {
  id: number
}

export interface SearchMemoryArgs {
  keyword: string
}

export interface MemoryStats {
  long_term: number
  mid_term: number
  short_term: number
  total: number
}

export interface GroupedMemories {
  long_term: Memory[]
  mid_term: Memory[]
  short_term: Memory[]
}
