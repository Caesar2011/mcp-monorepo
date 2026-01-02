#!/usr/bin/env node

import { mkdir } from 'node:fs/promises'

import { createMcpServer, logger } from '@mcp-monorepo/shared'

import { NOTION_CONTENT_DIR, NOTION_RAG_DIR } from './lib/config.js'
import { NotionSyncer } from './lib/notion-syncer.js'
import { type ToolServices } from './lib/types.js'
import { LocalRAG } from './local-rag/index.js'
import { registerCreatePagesTool } from './tools/create-pages.js'
import { registerFetchTool } from './tools/fetch.js'
import { registerQueryDatasourceTool } from './tools/query-datasource.js'
import { registerSearchTool } from './tools/search.js'
import { registerUpdatePageTool } from './tools/update-page.js'

// Define a container for services that will be initialized in `onReady`.
// This object's reference is stable and can be passed to the tools at configuration time.
const services: ToolServices = {}

createMcpServer({
  name: 'notion-query',
  importMetaPath: import.meta.filename,
  title: 'Notion Query MCP Server',
  tools: [
    // Pass the stable 'services' object reference to each tool registration function.
    // The tool implementation will then access services.notionSyncer or services.localRag,
    // which will be populated after onReady completes.
    (server) => registerQueryDatasourceTool(server, services),
    (server) => registerFetchTool(server, services),
    (server) => registerCreatePagesTool(server, services),
    (server) => registerUpdatePageTool(server, services),
    (server) => registerSearchTool(server, services),
  ],
  async onReady() {
    // 1. Initialize LocalRAG.
    logger.info(`Initializing LocalRAG with data directory: ${NOTION_RAG_DIR}`)
    services.localRag = await LocalRAG.create({
      dbPath: NOTION_RAG_DIR,
      baseDir: NOTION_RAG_DIR,
    })

    // 2. Ensure content directory exists and start watching it for changes.
    await mkdir(NOTION_CONTENT_DIR, { recursive: true })
    logger.log(`Watching Notion content directory: ${NOTION_CONTENT_DIR}`)
    await services.localRag.ingestFolder({ folderPath: NOTION_CONTENT_DIR, watch: true })

    // 3. Initialize and start the Notion Syncer in the background.
    services.notionSyncer = new NotionSyncer()
    await services.notionSyncer.start()

    logger.info('Notion Query server is ready.')
  },
  async onClose() {
    logger.info('Shutting down Notion Query services gracefully...')
    if (services.notionSyncer) {
      services.notionSyncer.stop()
    }
    if (services.localRag) {
      await services.localRag.shutdown()
    }
    logger.info('Notion Query services shut down.')
  },
})
