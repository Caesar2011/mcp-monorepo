/* eslint-disable use-logger-not-console/replace-console-with-logger */
/**
 * =============================================================================
 * LocalRAG Self-Contained Demo Script
 * =============================================================================
 *
 * This script is now fully self-contained. It will create its own test data.
 *
 * How to Run:
 * 1. From the root of the `packages/notion-query` directory, run:
 *    npx ts-node-esm ./src/DEMO.ts
 *
 * What this script does:
 * 1. Cleans up any previous demo database and data directory.
 * 2. Creates the `./src/data` directory and test files (`rag-intro.txt`, `project-phoenix.md`).
 * 3. Initializes the LocalRAG library.
 * 4. Ingests a raw text snippet and the newly created files.
 * 5. Lists all indexed documents.
 * 6. Performs a natural language query and prints the results.
 * 7. Shuts down the RAG instance gracefully.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { logger } from '@mcp-monorepo/shared'

import { LocalRAG } from './index.js'

// --- Demo File Content ---
const RAG_INTRO_CONTENT = `LocalRAG is a powerful, private, and configurable local library for Retrieval-Augmented Generation.
This library allows developers to easily build applications that can reason about local files and data.
Key features include file and folder ingestion, text and URL ingestion, and fast vector-based search.`

const PROJECT_PHOENIX_CONTENT = `# Project Phoenix: A Next-Generation AI Assistant

Project Phoenix is a new initiative focused on building an AI assistant that runs entirely on-device.
It prioritizes user privacy and data security above all else.
The core technology leverages small, efficient language models combined with a robust vector database for long-term memory.
The assistant can help with tasks like summarizing documents, answering questions about your local files, and managing your schedule.`

/**
 * Creates the necessary demo data directory and files.
 * This makes the demo script fully self-contained.
 * @param dataPath - The path to the directory where data should be created.
 */
async function setupDemoData(dataPath: string): Promise<void> {
  console.log(`\n--- 2. Setting up demo data in ${dataPath} ---`)
  try {
    // Ensure the data directory exists
    await mkdir(dataPath, { recursive: true })

    const introFilePath = resolve(dataPath, 'rag-intro.txt')
    const phoenixFilePath = resolve(dataPath, 'project-phoenix.md')

    // Write both files asynchronously
    await Promise.all([
      writeFile(introFilePath, RAG_INTRO_CONTENT, 'utf-8'),
      writeFile(phoenixFilePath, PROJECT_PHOENIX_CONTENT, 'utf-8'),
    ])

    console.log('  -> Created rag-intro.txt')
    console.log('  -> Created project-phoenix.md')
    console.log('✅ Demo data created successfully.')
  } catch (error) {
    console.error('Failed to create demo data:', error)
    // If data creation fails, we should stop the demo
    throw error
  }
}

// --- Main Demo Function ---
async function runDemo() {
  const dbPath = resolve(process.cwd(), '.rag_db_demo')
  const dataPath = resolve(process.cwd(), 'src', 'data')
  let rag: LocalRAG | undefined

  console.log('🚀 Starting LocalRAG Demo 🚀')

  try {
    // --- 1. Cleanup ---
    console.log('\n--- 1. Cleaning up previous demo files ---')
    await Promise.all([rm(dbPath, { recursive: true, force: true }), rm(dataPath, { recursive: true, force: true })])
    console.log(`Previous database and data directory removed.`)

    // --- 2. Create Demo Data ---
    await setupDemoData(dataPath)

    // --- 3. Initialize RAG ---
    console.log('\n--- 3. Initializing LocalRAG ---')
    rag = await LocalRAG.create({ dbPath })
    console.log('✅ LocalRAG initialized successfully.')

    // --- 4. Ingesting Content ---
    console.log('\n--- 4. Ingesting content ---')

    await rag.ingestText({
      label: 'greeting-message',
      text: 'Hello, world! This is a raw text snippet added to the vector store.',
      tags: ['test', 'greeting'],
    })
    console.log('  -> Ingested a raw text snippet.')

    await rag.ingestFolder({
      folderPath: dataPath,
      project: 'demo-project',
    })
    console.log(`  -> Ingested all files from the '${dataPath}' folder.`)
    console.log('✅ Ingestion complete.')

    // --- 5. Listing Ingested Documents ---
    console.log('\n--- 5. Listing all ingested documents ---')
    const allItems = await rag.list()
    console.log(`Found ${allItems.length} documents in the store:`)
    allItems.forEach((item) => {
      console.log(`  - [${item.metadata?.project}] ${item.filePath} (${item.chunkCount} chunks)`)
    })

    // --- 6. Performing a Query ---
    console.log('\n--- 6. Performing a query ---')
    const queryText = 'What is a local rag?'
    console.log(`❓ Query: "${queryText}"\n`)

    console.time('query')
    const results = await rag.query({
      query: queryText,
      limit: 3,
    })
    console.timeEnd('query')

    console.log('✅ Query completed. Top results:')
    if (results.length > 0) {
      results.forEach((result, index) => {
        console.log(`\n--- Result ${index + 1} (Score: ${result.score.toFixed(4)}) ---`)
        console.log(`  Source: ${result.filePath}`)
        console.log(`  Content: "${result.text.trim().replace(/\n/g, ' ')}"`)
        console.log(`  Metadata: ${JSON.stringify(result.metadata)}`)
      })
    } else {
      console.log('No relevant results found.')
    }
  } catch (error) {
    console.error('\n❌ An error occurred during the demo:', error)
  } finally {
    // --- 7. Shutdown ---
    if (rag) {
      console.log('\n--- 7. Shutting down LocalRAG ---')
      await rag.shutdown()
      logger.close()
      console.log('✅ Shutdown complete.')
    }
  }
}

// Run the demo
runDemo()
