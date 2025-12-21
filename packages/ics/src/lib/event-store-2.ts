import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'

import { findProjectRoot, logger, RefreshablePromise } from '@mcp-monorepo/shared'

import { getIcsUrls } from './config.js'
import { deserialize, prepare, serialize, type PreparedIcs } from '../ics-parser/index.js'

/**
 * The core refresh function. It fetches ICS files, prepares them using the parser,
 * and caches the prepared, serializable data. On failure, it falls back to the cache.
 */
async function refreshPreparedData(): Promise<{ prepared: PreparedIcs; errors: string[] }> {
  logger.info('Refreshing and preparing calendar data...')
  const sources = getIcsUrls()
  const allErrors: string[] = []
  const projectRoot = await findProjectRoot(import.meta.dirname)

  const processPromises = sources.map(async (source): Promise<PreparedIcs | undefined> => {
    // Cache prepared data in its own directory
    const dataFile = join(projectRoot, 'data', 'ics-prepared', source.url.replace(/[^a-zA-Z0-9]/g, '_') + '.json')

    try {
      logger.info(`[${source.name}] Attempting to fetch fresh data...`)
      const response = await fetch(source.url)
      if (!response.ok) {
        throw new Error(`Fetch failed with status ${response.status} ${response.statusText}`)
      }
      const icsText = await response.text()
      const preparedData = prepare(icsText)

      // Inject the source name into each event component for later identification.
      // This uses a custom 'X-' property, which the parser is designed to handle.
      preparedData.events.forEach((eventComponent) => {
        eventComponent.properties.push({
          key: 'X-MCP-SOURCE',
          value: source.name,
          params: {},
        })
      })

      logger.info(`[${source.name}] Successfully fetched and prepared data.`)

      // Asynchronously cache the new prepared data
      try {
        await mkdir(dirname(dataFile), { recursive: true })
        const jsonToCache = serialize(preparedData)
        await writeFile(dataFile, jsonToCache)
        logger.info(`[${source.name}] Successfully cached prepared data.`)
      } catch (cacheError) {
        logger.warn(`[${source.name}] Failed to write prepared data to cache: ${cacheError}`)
      }
      return preparedData
    } catch (fetchError) {
      const errorMessage = `[${source.name}] Fetch failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}.`
      logger.warn(`${errorMessage} Attempting to use cache.`)

      try {
        const cachedJson = await readFile(dataFile, 'utf-8')
        const preparedData = deserialize(cachedJson)
        logger.info(`[${source.name}] Successfully loaded prepared data from cache.`)
        return preparedData
      } catch (cacheError) {
        const finalErrorMsg = `[${source.name}] Fetch failed and cache is unavailable or corrupt.`
        logger.error(finalErrorMsg, cacheError)
        allErrors.push(finalErrorMsg)
        return undefined // Indicate failure for this source
      }
    }
  })

  // Wait for all sources to be processed (either fetched or from cache)
  const allPreparedOrNull = await Promise.all(processPromises)
  const allPrepared = allPreparedOrNull.filter((p): p is PreparedIcs => p !== undefined)

  // Combine all prepared data into a single object for the consumer
  const combinedPrepared: PreparedIcs = { events: [], tzData: new Map() }
  for (const preparedData of allPrepared) {
    combinedPrepared.events.push(...preparedData.events)
    for (const [tzid, data] of preparedData.tzData.entries()) {
      combinedPrepared.tzData.set(tzid, data)
    }
  }

  logger.info(
    `Finished refreshing. Total VEVENTs prepared: ${combinedPrepared.events.length}, Total errors: ${allErrors.length}`,
  )
  return { prepared: combinedPrepared, errors: allErrors }
}

let preparedDataInstance: RefreshablePromise<{ prepared: PreparedIcs; errors: string[] }>

/**
 * Gets the singleton instance of the RefreshablePromise for prepared ICS data.
 * The instance is created on the first call.
 */
export function getPreparedIcs() {
  if (!preparedDataInstance) {
    preparedDataInstance = new RefreshablePromise(refreshPreparedData)
  }
  return preparedDataInstance
}
