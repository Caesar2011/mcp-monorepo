import { rm, readdir, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { logger } from '@mcp-monorepo/shared'
import { ThrottledExecutor } from '@mcp-monorepo/shared'
import { isFullPage, APIErrorCode, type Client, isFullBlock } from '@notionhq/client'

import { getNotionClient } from './client.js'
import {
  GC_INTERVAL_MS,
  NOTION_API_RATE_LIMIT_DELAY_MS,
  NOTION_CONTENT_DIR,
  NOTION_PAGINATION_LIMIT,
  SYNC_BATCH_SIZE,
  SYNC_INTERVAL_MS,
} from './config.js'
import { normalizeId } from './id-utils.js'
import { notionToMarkdown } from './markdown-converter.js'
import { loadSyncState, saveSyncState, type SyncState } from './sync-state-manager.js'

const NOTION_URL_REGEX = /https:\/\/www.notion.so\/[a-zA-Z0-9-]+-([a-zA-Z0-9]{32})/g

/**
 * Manages the continuous, queue-based synchronization of a Notion workspace
 * to a local RAG-compatible directory using a throttled, robust process.
 */
export class NotionSyncer {
  private readonly notion: Client
  private readonly throttler: ThrottledExecutor
  private state: SyncState | undefined
  private syncTimeout: NodeJS.Timeout | undefined
  private gcTimeout: NodeJS.Timeout | undefined
  private isSyncing = false

  constructor() {
    this.notion = getNotionClient()
    this.throttler = new ThrottledExecutor(NOTION_API_RATE_LIMIT_DELAY_MS)
  }

  public async start(): Promise<void> {
    await mkdir(NOTION_CONTENT_DIR, { recursive: true })
    this.state = await loadSyncState()
    logger.info('NotionSyncer started. Scheduling initial sync and GC.')
    this.scheduleNextSync(1000) // Start first sync almost immediately
    this.scheduleNextGc(GC_INTERVAL_MS)
  }

  public stop(): void {
    if (this.syncTimeout) clearTimeout(this.syncTimeout)
    if (this.gcTimeout) clearTimeout(this.gcTimeout)
    logger.info('NotionSyncer stopped.')
  }

  public getSyncState(): SyncState | undefined {
    return this.state
  }

  public async triggerImmediateSync(pageId: string): Promise<void> {
    const normalizedId = normalizeId(pageId)
    if (!normalizedId || !this.state) return

    logger.info(`Received immediate sync trigger for page: ${normalizedId}`)
    const existingPage = this.state.pages[normalizedId]

    this.state.pages[normalizedId] = {
      ...(existingPage ?? { title: undefined, url: undefined }),
      lastEdited: undefined, // Mark as needing processing
    }

    await saveSyncState(this.state)
  }

  private scheduleNextSync(delay: number): void {
    if (this.syncTimeout) clearTimeout(this.syncTimeout)
    this.syncTimeout = setTimeout(() => {
      this._runSyncLoop().catch((error) => {
        logger.error('Fatal error in sync loop. Rescheduling.', error)
        this.isSyncing = false
        this.scheduleNextSync(SYNC_INTERVAL_MS)
      })
    }, delay)
  }

  private scheduleNextGc(delay: number): void {
    if (this.gcTimeout) clearTimeout(this.gcTimeout)
    this.gcTimeout = setTimeout(() => {
      this._garbageCollect().catch((error) => {
        logger.error('Error during garbage collection. Rescheduling.', error)
        this.scheduleNextGc(GC_INTERVAL_MS)
      })
    }, delay)
  }

  private async _runSyncLoop(): Promise<void> {
    if (this.isSyncing) return
    this.isSyncing = true
    logger.info('Starting sync loop...')

    try {
      const processingQueue = await this._buildProcessingQueue()
      await this._processQueue(processingQueue)
    } finally {
      this.isSyncing = false
      logger.info('Sync loop finished.')
      this.scheduleNextSync(SYNC_INTERVAL_MS)
    }
  }

  private async _buildProcessingQueue(): Promise<string[]> {
    if (!this.state) return []
    const queue = new Set<string>()

    // Priority 1: Pages discovered but never processed
    for (const [pageId, pageInfo] of Object.entries(this.state.pages)) {
      if (pageInfo.lastEdited === undefined) {
        queue.add(pageId)
      }
    }

    logger.info(`Found ${queue.size} unprocessed (discovered) pages.`)
    if (queue.size >= SYNC_BATCH_SIZE) {
      return Array.from(queue).slice(0, SYNC_BATCH_SIZE)
    }

    // Priority 2: Find recently changed pages via search API
    let hasMore = true
    let nextCursor: string | undefined
    while (queue.size < SYNC_BATCH_SIZE && hasMore) {
      const response = await this.throttler.execute(() =>
        this.notion.search({
          sort: { direction: 'descending', timestamp: 'last_edited_time' },
          page_size: NOTION_PAGINATION_LIMIT,
          start_cursor: nextCursor,
        }),
      )

      for (const page of response.results) {
        if (queue.size >= SYNC_BATCH_SIZE) break
        if (isFullPage(page)) {
          const existingPage = this.state.pages[page.id]
          if (!existingPage) {
            this.state.pages[page.id] = { lastEdited: undefined, title: undefined, url: undefined }
            queue.add(page.id)
          } else if (existingPage.lastEdited !== page.last_edited_time) {
            queue.add(page.id)
          }
        }
      }
      hasMore = response.has_more
      nextCursor = response.next_cursor ?? undefined
    }

    await saveSyncState(this.state)
    return Array.from(queue)
  }

  private async _processQueue(queue: string[]): Promise<void> {
    if (queue.length === 0) return
    if (!this.state) throw new Error('Sync state not initialized.')
    logger.info(`Sync state contains ${Object.keys(this.state.pages).length} pages. ${queue.length} will be processed.`)

    for (const pageId of queue) {
      try {
        await this._processPage(pageId)
        await saveSyncState(this.state)
      } catch (error: unknown) {
        if (typeof error === 'object' && error && 'code' in error && error.code === APIErrorCode.ObjectNotFound) {
          logger.info(`Page ${pageId} not found on Notion during processing. Deleting.`)
          await this._deletePageData(pageId)
        } else {
          logger.error(`Failed to process page ${pageId}. It will be retried in a future cycle.`, error)
        }
      }
    }
  }

  private async _processPage(pageId: string): Promise<void> {
    if (!this.state) throw new Error('Sync state not initialized.')

    const page = await this.throttler.execute(() => this.notion.pages.retrieve({ page_id: pageId }))
    if (!isFullPage(page)) return

    const blocks = await this.throttler.execute(() => this.notion.blocks.children.list({ block_id: page.id }))
    const markdownContent = await notionToMarkdown(blocks.results.filter(isFullBlock))

    const titleProperty = Object.values(page.properties).find((prop) => prop.type === 'title')
    const title =
      titleProperty?.type === 'title' && titleProperty.title[0]?.plain_text
        ? titleProperty.title[0].plain_text
        : 'Untitled'

    await writeFile(resolve(NOTION_CONTENT_DIR, `${page.id}.md`), `# ${title}\n\n${markdownContent}`, 'utf-8')

    this.state.pages[page.id] = { lastEdited: page.last_edited_time, title, url: page.url }

    const blockString = JSON.stringify(blocks.results)
    const matches = blockString.matchAll(NOTION_URL_REGEX)
    for (const match of matches) {
      const childId = normalizeId(match[1])
      if (childId && !this.state.pages[childId]) {
        logger.info(`Discovered new child page ${childId}. It will be processed in a future cycle.`)
        this.state.pages[childId] = { lastEdited: undefined, title: undefined, url: undefined }
      }
    }
  }

  private async _garbageCollect(): Promise<void> {
    if (!this.state) return
    logger.info('Running local file garbage collection...')
    let stateWasChanged = false
    try {
      const localFileIds = (await readdir(NOTION_CONTENT_DIR)).map((name) => name.replace('.md', ''))
      for (const fileId of localFileIds) {
        if (!this.state.pages[fileId]) {
          logger.info(`GC: Deleting orphaned local file: ${fileId}.md`)
          await rm(resolve(NOTION_CONTENT_DIR, `${fileId}.md`))
          stateWasChanged = true
        }
      }
    } catch (error: unknown) {
      logger.error('Error during local file garbage collection.', error)
    }

    if (stateWasChanged) {
      await saveSyncState(this.state)
    }
    this.scheduleNextGc(GC_INTERVAL_MS)
  }

  private async _deletePageData(pageId: string): Promise<void> {
    if (!this.state) return
    delete this.state.pages[pageId]
    await rm(resolve(NOTION_CONTENT_DIR, `${pageId}.md`), { force: true })
    await saveSyncState(this.state)
  }
}
