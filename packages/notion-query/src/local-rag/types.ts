// ============================================
// Main Configuration
// ============================================

/**
 * Configuration options for the LocalRAG instance.
 */
export interface LocalRAGConfig {
  /** Path to the LanceDB database directory. */
  dbPath: string
  /** Path to the directory for caching embedding models. */
  cacheDir?: string
  /** The root directory to which file access is restricted for security. */
  baseDir?: string
  /** HuggingFace model identifier for text embeddings. */
  modelName?: string
  /** Maximum file size in bytes for ingestion. Defaults to 100MB. */
  maxFileSize?: number
  /** The target size of each text chunk in characters. */
  chunkSize?: number
  /** The number of characters to overlap between adjacent chunks. */
  chunkOverlap?: number
  /**
   * The debounce time in milliseconds for file watcher events to avoid rapid re-indexing.
   * @default 5000
   */
  debounceMs?: number
  /**
   * Interval in milliseconds to automatically run the cleanup job for expired documents.
   * If not set, cleanup must be triggered manually.
   * @example 86400000 (for 24 hours)
   */
  cleanupIntervalMs?: number
  /**
   * Interval in milliseconds to automatically run the database optimization job (compacts files, rebuilds indexes).
   * Recommended for write-heavy applications.
   * @example 3600000 (for 1 hour)
   */
  optimizeIntervalMs?: number
  /** Advanced options for tuning the retrieval process. */
  retrievalOptions?: RetrievalOptions
  /** Configuration for the embedding worker pool. */
  poolConfig?: PoolConfig
}

/**
 * Configuration options for the dynamic worker pool.
 */
export interface PoolConfig {
  /**
   * The maximum number of workers the pool can scale up to.
   * Defaults to the number of CPU cores minus one.
   */
  maxWorkers?: number
  /**
   * The minimum number of workers to keep alive, even if idle.
   * @default 0
   */
  minWorkers?: number
  /**
   * The time in milliseconds an idle worker will wait before being terminated.
   * Set to 0 to disable automatic scaling down.
   * @default 1800000 (30 minutes)
   */
  idleTimeoutMs?: number
}

/**
 * Represents a persisted watched path in the database.
 */
export interface WatchedPath {
  path: string
  type: 'file' | 'folder'
  recursive: boolean
  addedAt: string
}

/**
 * Advanced options for tuning search and retrieval.
 */
export interface RetrievalOptions {
  /**
   * The weight of keyword (BM25) search vs. semantic (vector) search in hybrid search.
   * 0.0 = Purely semantic, 1.0 = Purely keyword.
   * Recommended for code/technical docs: 0.6 - 0.7.
   * @default 0.6
   */
  hybridWeight?: number
  /**
   * Filters results by detecting relevance gaps.
   * - 'similar': Returns only the most relevant group of results.
   * - 'related': Returns the top two most relevant groups.
   * - undefined: No grouping, returns all results up to the limit.
   */
  grouping?: GroupingMode
  /**
   * An absolute distance threshold. Results with a score greater than this are discarded.
   * For dot product, a lower score is better (0 = identical).
   * E.g., a value of 0.5 would filter out less relevant matches.
   */
  maxDistance?: number
}

export type GroupingMode = 'similar' | 'related'

// ============================================
// Data Structures
// ============================================

/**
 * Metadata associated with an ingested document or text snippet.
 */
export interface DocumentMetadata {
  fileName: string
  fileSize: number
  fileType: string
  language?: string
  tags?: string[]
  project?: string
  memoryType?: 'file' | 'text' | 'url'
  expiresAt?: string // ISO 8601
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  sourceUrl?: string // For web-scraped content

  // Extended metadata
  author?: string
  fileCreatedAt?: string // ISO 8601 - File system creation time
  fileModifiedAt?: string // ISO 8601 - File system modification time
}

/**
 * A chunk of text ready to be inserted into the vector store.
 */
export interface VectorChunk {
  id: string // UUID
  filePath: string // Absolute path or synthetic path like 'memory://<label>'
  chunkIndex: number
  text: string
  vector: number[]
  metadata?: DocumentMetadata
  timestamp: string // ISO 8601, for backward compatibility/sorting
}

export interface WatchOptions {
  /** For folders, specifies whether to watch subdirectories. @default false */
  recursive?: boolean
}

// ============================================
// Public API Input/Output Types
// ============================================

export interface IngestFileInput {
  filePath: string
  tags?: string[]
  project?: string
  /** If true, the file will be monitored for changes. */
  watch?: boolean
}

export interface IngestFolderInput {
  folderPath: string
  tags?: string[]
  project?: string
  /** If true, the folder will be monitored for new, changed, and deleted files. */
  watch?: boolean
  /** If true, subdirectories will also be processed and watched. @default false */
  recursive?: boolean
}

export interface IngestTextInupt {
  text: string
  label: string // Unique identifier for the snippet
  language?: string
  tags?: string[]
  project?: string
  ttl?: string // e.g., '7d', '30d', '1y'
}

export interface IngestUrlInput {
  url: string
  tags?: string[]
  project?: string
  ttl?: string
}

export interface QueryInput {
  query: string
  limit?: number
  filters?: QueryFilters
}

export interface QueryFilters {
  type?: 'file' | 'text' | 'url'
  tags?: string[] // AND logic: must contain all tags
  project?: string
  fileName?: string
}

export interface QueryResult {
  filePath: string
  chunkIndex: number
  text: string
  score: number // Distance score (lower is better)
  metadata?: DocumentMetadata
}

export interface UpdateMemoryInput {
  label: string
  mode?: 'replace' | 'append' | 'prepend'
  text?: string
  tags?: string[] // Replaces all existing tags
  addTags?: string[]
  removeTags?: string[]
}

export interface ListOptions {
  /** The number of items to return. @default 20 */
  limit?: number
  /** The number of items to skip for pagination. @default 0 */
  offset?: number
  filters?: QueryFilters
}

export interface ListItem {
  filePath: string
  chunkCount: number
  timestamp: string // Last updated
  metadata?: DocumentMetadata
}

export interface StatusReport {
  documentCount: number
  chunkCount: number
  memoryUsageMb: number
  uptimeSeconds: number
  ftsIndexEnabled: boolean
  searchMode: 'hybrid' | 'vector-only'
}
