// noinspection JSUnusedGlobalSymbols

import { randomUUID } from 'node:crypto'
import { readdir, stat } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'

import { logger } from '@mcp-monorepo/shared'

import { DocumentChunker } from './chunker.js'
import { Embedder } from './embedder.js'
import { ValidationError } from './errors.js'
import { parseHtmlContent } from './html-parser.js'
import { DocumentParser } from './parser.js'
import { VectorStore } from './vectordb/index.js'
import { DirectoryWatcher } from './watcher.js'

import type {
  DocumentMetadata,
  IngestFileInput,
  IngestFolderInput,
  IngestTextInupt,
  IngestUrlInput,
  ListItem,
  ListOptions,
  LocalRAGConfig,
  QueryInput,
  QueryResult,
  StatusReport,
  UpdateMemoryInput,
  VectorChunk,
  WatchOptions,
} from './types.js'

/**
 * A powerful, private, and configurable local RAG library.
 */
export class LocalRAG {
  private readonly config: Required<LocalRAGConfig>
  private readonly parser: DocumentParser
  private readonly chunker: DocumentChunker
  private readonly embedder: Embedder
  private readonly vectorStore: VectorStore
  private readonly watcher: DirectoryWatcher

  private cleanupIntervalId?: NodeJS.Timeout
  private optimizeIntervalId?: NodeJS.Timeout

  private constructor(config: Required<LocalRAGConfig>, embedder: Embedder, vectorStore: VectorStore) {
    this.config = config
    // Initialize components
    this.parser = new DocumentParser({
      baseDir: this.config.baseDir,
      maxFileSize: this.config.maxFileSize,
    })
    this.chunker = new DocumentChunker({
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
    })
    this.embedder = embedder
    this.vectorStore = vectorStore

    // Initialize the watcher
    this.watcher = new DirectoryWatcher(this.config.debounceMs, this.parser.getSupportedExtensions())
    this.setupWatcherListeners()
  }

  static async create(config: LocalRAGConfig): Promise<LocalRAG> {
    const baseDir = resolve(config.baseDir ?? process.cwd())
    const requiredConfig: Required<LocalRAGConfig> = {
      baseDir,
      dbPath: config.dbPath,
      cacheDir: config.cacheDir ?? resolve(baseDir, '.cache', 'models'),
      modelName: config.modelName ?? 'Xenova/all-MiniLM-L6-v2',
      maxFileSize: config.maxFileSize ?? 100 * 1024 * 1024, // 100MB
      chunkSize: config.chunkSize ?? 512,
      chunkOverlap: config.chunkOverlap ?? 100,
      debounceMs: config.debounceMs ?? 5000,
      cleanupIntervalMs: config.cleanupIntervalMs ?? 0, // Default to disabled
      optimizeIntervalMs: config.optimizeIntervalMs ?? 0, // Default to disabled
      retrievalOptions: config.retrievalOptions ?? {},
      poolConfig: config.poolConfig ?? {},
    }

    const embedder = await Embedder.create({
      modelPath: requiredConfig.modelName,
      batchSize: 32,
      cacheDir: requiredConfig.cacheDir,
      poolConfig: requiredConfig.poolConfig,
    })
    const vectorStore = await VectorStore.create({
      dbPath: requiredConfig.dbPath,
      ...requiredConfig.retrievalOptions,
    })
    const rag = new LocalRAG(requiredConfig, embedder, vectorStore)
    await rag.initialize()
    return rag
  }

  /**
   * Initializes the database connection and starts background jobs. Must be called before any other methods.
   */
  private async initialize(): Promise<void> {
    // Hydrate the watcher with persisted paths
    const watchedPaths = await this.vectorStore.getWatchedPaths()
    for (const item of watchedPaths) {
      this.watcher.watch(item.path)
    }
    logger.info(`Watcher initialized and now monitoring ${watchedPaths.length} persisted paths.`)

    this.startPeriodicJobs()
  }

  /**
   * Gracefully shuts down all background processes like the watcher, embedder pool, and periodic jobs.
   */
  public async shutdown(): Promise<void> {
    if (this.cleanupIntervalId) clearInterval(this.cleanupIntervalId)
    if (this.optimizeIntervalId) clearInterval(this.optimizeIntervalId)

    await this.watcher.close()
    await this.embedder.destroy()
    this.vectorStore.close()
    logger.info('LocalRAG shutdown complete.')
  }

  public async ingestFile(input: IngestFileInput): Promise<void> {
    // Callers are responsible for handling errors, including those from unsupported file types.
    // The watcher listener has special handling to ignore unsupported files.
    const { filePath, tags, project, watch } = input
    const absolutePath = resolve(filePath)

    const stats = await this.parser.validateAndGetFileStats(absolutePath)
    const currentMtime = stats.fileModifiedAt

    const existingMetadata = await this.vectorStore.getLatestMetadata(absolutePath)

    if (existingMetadata?.fileModifiedAt === currentMtime) {
      logger.info(`Skipping ingestion for unchanged file: ${absolutePath}`)
    } else {
      logger.info(`Ingesting changed or new file: ${absolutePath}`)
      const { text, language, fileSize, metadata: fileMetadata } = await this.parser.parseFile(absolutePath)

      const metadata: Partial<DocumentMetadata> = {
        ...fileMetadata,
        fileName: basename(absolutePath),
        fileSize,
        fileType: extname(absolutePath).slice(1),
        language,
        tags: tags ?? [],
        project,
        memoryType: 'file',
      }

      const vectorChunks = await this._createVectorChunks(text, metadata, absolutePath)

      if (vectorChunks.length === 0) {
        logger.warn(
          `Skipping ingestion for ${absolutePath} as it produced no valid chunks (file might be empty or too short).`,
        )
        await this.vectorStore.deleteChunks(absolutePath)
        return
      }
      await this.vectorStore.deleteChunks(absolutePath)
      await this.vectorStore.insertChunks(vectorChunks)
    }

    if (watch && !this.watcher.isWatching(absolutePath)) {
      await this.watch(absolutePath)
    }
  }

  public async ingestFolder(input: IngestFolderInput): Promise<void> {
    const { folderPath, watch, recursive = false, project, tags } = input
    const absolutePath = resolve(folderPath)

    if (watch) {
      // If watching, we just attach the watcher. Chokidar with `ignoreInitial: false`
      // will emit 'add' events for all existing files, which our listeners will handle.
      logger.info(
        `Attaching watcher to ${absolutePath}. It will process existing and new files (recursive: ${recursive}).`,
      )
      await this.watch(absolutePath, { recursive })
    } else {
      // If not watching, perform a one-time manual scan and ingestion.
      logger.info(`Performing one-time ingestion for ${absolutePath} (recursive: ${recursive}).`)
      const filesToIndex = await this.findSupportedFiles(absolutePath, recursive)
      logger.info(`Found ${filesToIndex.length} supported files to ingest.`)
      await Promise.all(filesToIndex.map((filePath) => this.ingestFile({ filePath, project, tags, watch: false })))
    }
  }

  /**
   * Ingests a raw text snippet into the vector store.
   */
  public async ingestText(input: IngestTextInupt): Promise<void> {
    const { text, label, language, tags, project, ttl } = input
    if (!label.match(/^[\w.-]+$/)) {
      throw new ValidationError('Label must contain only alphanumeric characters, hyphens, underscores, and dots.')
    }

    const syntheticPath = `memory://${label}`

    const metadata: Partial<DocumentMetadata> = {
      fileName: label,
      fileSize: text.length,
      fileType: 'text-snippet',
      language,
      tags: tags ?? [],
      project,
      memoryType: 'text',
      expiresAt: ttl ? this.calculateExpiresAt(ttl) : undefined,
    }

    const vectorChunks = await this._createVectorChunks(text, metadata, syntheticPath)
    await this.vectorStore.deleteChunks(syntheticPath)
    await this.vectorStore.insertChunks(vectorChunks)
  }

  /**
   * Ingests content from a URL.
   */
  public async ingestUrl(input: IngestUrlInput): Promise<void> {
    const { url, tags, project, ttl } = input
    const label = basename(new URL(url).pathname) || `web-${Date.now()}`

    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch URL: ${response.statusText}`)
    const htmlContent = await response.text()
    const text = await parseHtmlContent(url, htmlContent)

    const syntheticPath = `url://${label}`

    const metadata: Partial<DocumentMetadata> = {
      fileName: label,
      fileSize: text.length,
      fileType: 'web-page',
      tags: tags ?? [],
      project,
      memoryType: 'url',
      expiresAt: ttl ? this.calculateExpiresAt(ttl) : undefined,
      sourceUrl: url,
    }

    const vectorChunks = await this._createVectorChunks(text, metadata, syntheticPath)
    await this.vectorStore.deleteChunks(syntheticPath)
    await this.vectorStore.insertChunks(vectorChunks)
  }

  /**
   * Searches the vector store with a natural language query.
   */
  public async query(input: QueryInput): Promise<QueryResult[]> {
    const { query, limit, filters } = input
    const queryVector = await this.embedder.embed(query)
    return this.vectorStore.search(queryVector, query, limit, filters)
  }

  /**
   * Updates an existing text snippet (memory).
   */
  public async updateMemory(input: UpdateMemoryInput): Promise<void> {
    const { label, mode = 'replace', text: newText, tags, addTags, removeTags } = input
    const syntheticPath = `memory://${label}`

    const existingChunks = await this.vectorStore.getChunksByPath(syntheticPath)
    if (existingChunks.length === 0) throw new Error(`Memory with label "${label}" not found.`)

    const oldMetadata = existingChunks[0].metadata
    let fullText = existingChunks
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
      .map((c) => c.text)
      .join('')

    if (newText) {
      if (mode === 'append') fullText += newText
      else if (mode === 'prepend') fullText = newText + fullText
      else fullText = newText
    }

    let newTags = oldMetadata?.tags ?? []
    if (tags) newTags = tags // Replace
    if (addTags) newTags = [...new Set([...newTags, ...addTags])]
    if (removeTags) newTags = newTags.filter((t) => !removeTags.includes(t))

    const updatedMetadata: Partial<DocumentMetadata> = {
      ...oldMetadata,
      tags: newTags,
      fileSize: fullText.length,
    }

    const vectorChunks = await this._createVectorChunks(fullText, updatedMetadata, syntheticPath)
    await this.vectorStore.deleteChunks(syntheticPath)
    await this.vectorStore.insertChunks(vectorChunks)
  }

  /**
   * Deletes a file or snippet from the vector store.
   */
  public async delete(path: string): Promise<void> {
    // Path can be an absolute file path or a synthetic path like `memory://label`
    await this.vectorStore.deleteChunks(path)
  }

  /**
   * Lists all items in the vector store, with optional filtering and pagination.
   */
  public async list(options?: ListOptions): Promise<ListItem[]> {
    return this.vectorStore.listFiles(options)
  }

  /**
   * Retrieves the current status of the RAG system.
   */
  public async getStatus(): Promise<StatusReport> {
    return this.vectorStore.getStatus()
  }

  /**
   * Manually triggers a cleanup of all expired text snippets from the database.
   */
  public async cleanupExpired(): Promise<number> {
    return this.vectorStore.cleanupExpired()
  }

  public async watch(path: string, options: WatchOptions = {}): Promise<void> {
    const absolutePath = resolve(path)
    if (this.watcher.isWatching(absolutePath)) return

    const stats = await stat(absolutePath)
    const type = stats.isDirectory() ? 'folder' : 'file'
    const recursive = type === 'folder' ? (options.recursive ?? false) : false

    await this.vectorStore.addWatchedPath(absolutePath, type, recursive)
    this.watcher.watch(absolutePath)
    logger.info(`Now watching path: ${absolutePath}`)
  }

  public async unwatch(path: string): Promise<void> {
    const absolutePath = resolve(path)
    await this.vectorStore.removeWatchedPath(absolutePath)
    this.watcher.unwatch(absolutePath)
    logger.info(`Stopped watching path: ${absolutePath}`)
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private startPeriodicJobs(): void {
    if (this.config.cleanupIntervalMs && this.config.cleanupIntervalMs > 0) {
      logger.info(`Starting periodic cleanup job every ${this.config.cleanupIntervalMs}ms.`)
      this.cleanupIntervalId = setInterval(async () => {
        try {
          logger.info('Running periodic cleanup job...')
          const deletedCount = await this.cleanupExpired()
          if (deletedCount > 0) {
            logger.info(`Periodic cleanup job finished. Removed ${deletedCount} expired items.`)
          }
        } catch (error: unknown) {
          logger.error('Periodic cleanup job failed.', error)
        }
      }, this.config.cleanupIntervalMs)
    }

    if (this.config.optimizeIntervalMs && this.config.optimizeIntervalMs > 0) {
      logger.info(`Starting periodic DB optimization every ${this.config.optimizeIntervalMs}ms.`)
      this.optimizeIntervalId = setInterval(async () => {
        try {
          await this.vectorStore.optimize()
        } catch (error: unknown) {
          logger.error('Periodic database optimization failed.', error)
        }
      }, this.config.optimizeIntervalMs)
    }
  }

  private async findSupportedFiles(folderPath: string, recursive: boolean): Promise<string[]> {
    const supportedExtensions = new Set(this.parser.getSupportedExtensions())
    const files: string[] = []
    const entries = await readdir(folderPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(folderPath, entry.name)
      if (entry.isDirectory() && recursive) {
        files.push(...(await this.findSupportedFiles(fullPath, true)))
      } else if (entry.isFile() && supportedExtensions.has(extname(entry.name).toLowerCase())) {
        files.push(fullPath)
      }
    }
    return files
  }

  private setupWatcherListeners(): void {
    const handleIngest = async (filePath: string) => {
      try {
        await this.ingestFile({ filePath })
      } catch (error) {
        if (error instanceof ValidationError && error.message.includes('Unsupported file format')) {
          // This is expected when the watcher picks up an unsupported file. Ignore it.
          logger.debug(`Watcher ignored unsupported file: ${filePath}`)
        } else {
          // Log any other unexpected errors during ingestion.
          logger.error(`Watcher failed to process file ${filePath}.`, error)
        }
      }
    }
    this.watcher.on('file-added', handleIngest)
    this.watcher.on('file-changed', handleIngest)
    this.watcher.on('file-deleted', (filePath) =>
      this.delete(filePath).catch((e) => logger.error(e, `Watcher failed to delete file: ${filePath}`)),
    )
  }

  private calculateExpiresAt(ttl: string): string {
    const match = ttl.match(/^(\d+)([dhy])$/)
    if (!match) throw new ValidationError(`Invalid TTL format: ${ttl}. Use '1d', '7h', '1y' etc.`)

    const value = parseInt(match[1], 10)
    const unit = match[2]
    const date = new Date()

    if (unit === 'd') date.setDate(date.getDate() + value)
    else if (unit === 'h') date.setHours(date.getHours() + value)
    else if (unit === 'y') date.setFullYear(date.getFullYear() + value)

    return date.toISOString()
  }

  private async _createVectorChunks(
    text: string,
    baseMetadata: Partial<DocumentMetadata>,
    path: string,
  ): Promise<VectorChunk[]> {
    const chunks = await this.chunker.chunkText(text)
    if (chunks.length === 0) return []

    const embeddings = await this.embedder.embedBatch(chunks.map((c) => c.text))
    const now = new Date().toISOString()

    return chunks.map((chunk, i) => ({
      id: randomUUID(),
      filePath: path,
      chunkIndex: chunk.index,
      text: chunk.text,
      vector: embeddings[i],
      metadata: {
        fileName: '', // Default values, will be overwritten
        fileSize: 0,
        fileType: '',
        createdAt: now,
        updatedAt: now,
        ...baseMetadata,
      },
      timestamp: now,
    }))
  }
}
