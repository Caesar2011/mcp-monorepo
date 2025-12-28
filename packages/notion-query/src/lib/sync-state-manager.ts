import { readFile, writeFile } from 'node:fs/promises'

import { logger } from '@mcp-monorepo/shared'

import { SYNC_STATE_PATH } from './config.js'

/**
 * Defines the structure for metadata associated with a single synchronized page.
 * 'undefined' for lastEdited indicates the page has been discovered but not yet processed.
 */
export type SyncedPageInfo = {
  lastEdited: string | undefined
  title: string | undefined
  url: string | undefined
}

/**
 * Defines the structure of the entire synchronization state file.
 */
export type SyncState = {
  pages: Record<string, SyncedPageInfo>
}

/**
 * Loads the synchronization state from the file system.
 * If the state file does not exist, it returns a default initial state.
 * @returns A promise that resolves to the loaded or initial SyncState.
 */
export async function loadSyncState(): Promise<SyncState> {
  try {
    const fileContent = await readFile(SYNC_STATE_PATH, 'utf-8')
    // A simple validation to ensure the loaded data has the expected structure.
    const parsed = JSON.parse(fileContent) as unknown
    if (typeof parsed === 'object' && parsed && 'pages' in parsed) {
      return parsed as SyncState
    }
    throw new Error('Loaded sync state has an invalid structure.')
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      logger.info('Sync state file not found. Creating a new one.')
      return { pages: {} }
    }
    logger.error('Failed to load or parse sync state file. Starting with a fresh state.', error)
    return { pages: {} }
  }
}

/**
 * Saves the provided synchronization state to the file system.
 * This function is critical for maintaining progress across restarts.
 * @param state - The SyncState object to save.
 * @returns A promise that resolves when the file has been written.
 */
export async function saveSyncState(state: SyncState): Promise<void> {
  try {
    const jsonString = JSON.stringify(state, undefined, 2)
    await writeFile(SYNC_STATE_PATH, jsonString, 'utf-8')
  } catch (error: unknown) {
    logger.error('CRITICAL: Failed to save sync state file. Progress may be lost.', error)
    // Re-throwing the error allows the calling function to handle the failure.
    throw error
  }
}
