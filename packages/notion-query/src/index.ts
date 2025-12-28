#!/usr/bin/env node

import { mkdir } from 'node:fs/promises'

import { createMcpServer, logger } from '@mcp-monorepo/shared'

import { NOTION_CONTENT_DIR, NOTION_RAG_DIR } from './lib/config.js'
import { NotionSyncer } from './lib/notion-syncer.js'
import { LocalRAG } from './local-rag/index.js'
import { registerCreatePagesTool } from './tools/create-pages.js'
import { registerFetchTool } from './tools/fetch.js'
import { registerQueryDatasourceTool } from './tools/query-datasource.js'
import { registerSearchTool } from './tools/search.js' // Import the new tool
import { registerUpdatePageTool } from './tools/update-page.js'

/**
 * Asynchronous main function to initialize services and start the MCP server.
 */
async function main() {
  // 1. Initialize LocalRAG to watch the dedicated Notion content directory.
  logger.info(`Initializing LocalRAG to watch: ${NOTION_CONTENT_DIR}`)
  const localRag = await LocalRAG.create({
    dbPath: NOTION_RAG_DIR,
    baseDir: NOTION_RAG_DIR,
  })

  // Watch the content folder for changes
  await mkdir(NOTION_CONTENT_DIR, { recursive: true })
  logger.log(`Watching Notion content directory: ${NOTION_CONTENT_DIR}`)
  await localRag.ingestFolder({ folderPath: NOTION_CONTENT_DIR, watch: true })

  // 2. Initialize and start the Notion Syncer in the background.
  const notionSyncer = new NotionSyncer()
  await notionSyncer.start()

  // 3. Create the MCP server and register all tools.
  // The search tool gets access to the RAG and Syncer instances.
  createMcpServer({
    name: 'notion-query',
    importMetaPath: import.meta.filename,
    title: 'Notion Query MCP Server',
    tools: [
      (server) => registerQueryDatasourceTool(server, notionSyncer),
      (server) => registerFetchTool(server, notionSyncer),
      (server) => registerCreatePagesTool(server, notionSyncer),
      (server) => registerUpdatePageTool(server, notionSyncer),
      (server) => registerSearchTool(server, localRag, notionSyncer),
    ],
  })

  // 4. Graceful shutdown handling
  const shutdown = async () => {
    logger.info('Shutting down services gracefully...')
    notionSyncer.stop()
    await localRag.shutdown()
    logger.close()
    setTimeout(() => process.exit(0), 1000)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

// Execute the main function
main().catch((error) => {
  logger.error('Failed to start the Notion Query MCP Server.', error)
  setTimeout(() => process.exit(1), 1000)
})
