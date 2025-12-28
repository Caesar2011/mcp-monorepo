import { resolve } from 'node:path'

import { findProjectRoot } from '@mcp-monorepo/shared'

const projectRoot = await findProjectRoot(import.meta.dirname)

/**
 * The root directory for all application-specific data, located in the user's home directory.
 */
export const APP_DATA_DIR = process.env.NOTION_QUERY_APP_DATA_DIR
  ? resolve(process.env.NOTION_QUERY_APP_DATA_DIR)
  : resolve(projectRoot, 'rag-data')

/**
 * The directory where all data related to the Notion RAG index is stored.
 */
export const NOTION_RAG_DIR = APP_DATA_DIR

/**
 * The directory where downloaded and converted Notion pages (as Markdown) are stored.
 * This is the folder that the LocalRAG instance will watch.
 */
export const NOTION_CONTENT_DIR = resolve(APP_DATA_DIR, 'content')

/**
 * The full path to the JSON file that stores the synchronization state.
 */
export const SYNC_STATE_PATH = resolve(APP_DATA_DIR, 'sync-state.json')

/**
 * The delay in milliseconds between API calls enforced by the NotionApiThrottler.
 * The Notion API has a limit of approximately 3 requests per second. 350ms provides a safe buffer.
 */
export const NOTION_API_RATE_LIMIT_DELAY_MS = 350

/**
 * The number of pages to fetch in a single paginated API request.
 * The maximum allowed by the Notion API is 100.
 */
export const NOTION_PAGINATION_LIMIT = 100

/**
 * The total number of pages to add to the processing queue during each sync cycle.
 * This acts as a cap to ensure each sync loop is reasonably short.
 * @default 30
 */
export const SYNC_BATCH_SIZE = parseInt(process.env.NOTION_SYNC_BATCH_SIZE ?? '30', 10)

/**
 * The interval in milliseconds that the main synchronization loop waits after completing.
 * @default 15 minutes
 */
export const SYNC_INTERVAL_MS = parseInt(process.env.NOTION_SYNC_INTERVAL_MS ?? `${15 * 60 * 1000}`, 10)

/**
 * The interval for the local-only garbage collection task, which removes orphaned files.
 * @default 12 hours
 */
export const GC_INTERVAL_MS = parseInt(process.env.NOTION_GC_INTERVAL_MS ?? `${6 * 60 * 60 * 1000}`, 10)
