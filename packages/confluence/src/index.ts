#!/usr/bin/env node

import { createMcpServer, logger } from '@mcp-monorepo/shared'

import { getConfluenceApiVersion, getConfluenceAuthMode, getConfluenceBaseUrl } from './lib/confluence-env.js'
import { registerCreatePageTool } from './tools/create-page.js'
import { registerListSpacePagesTool } from './tools/list-pages-of-space.js'
import { registerListSpacesTool } from './tools/list-spaces.js'
import { registerOpenPageTool } from './tools/open-page.js'
import { registerSearchCqlTool } from './tools/search-cql.js'
import { registerSearchPagesTool } from './tools/search-pages.js'
import { registerUpdatePageTool } from './tools/update-page.js'

// Determine API version and build tool list dynamically
const apiVersion = getConfluenceApiVersion()

const tools = [
  // Common tools (available in both v1 and v2)
  registerOpenPageTool,
  registerListSpacePagesTool,
  registerListSpacesTool,
  registerCreatePageTool,
  registerUpdatePageTool,
  // Version-specific tools
  ...(apiVersion === '1' ? [registerSearchCqlTool] : [registerSearchPagesTool]),
]

createMcpServer({
  name: 'confluence',
  importMetaPath: import.meta.filename,
  title: 'Confluence MCP Server',
  tools,
  async onReady() {
    if (process.env.CONFLUENCE_INSECURE_SKIP_VERIFY === 'true') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      logger.warn(
        'TLS certificate validation is disabled for Confluence requests (CONFLUENCE_INSECURE_SKIP_VERIFY=true). This is a security risk and should only be used for trusted, self-hosted environments.',
      )
    }

    // Validate required environment variables on startup. This will throw an
    // error and prevent the server from starting if they are missing.
    getConfluenceBaseUrl()
    getConfluenceAuthMode()

    // Log API version
    logger.info(`Confluence MCP Server starting with API v${apiVersion}`)
    if (apiVersion === '1') {
      logger.info('Registered tools: open-page, search-cql, list-pages-of-space, list-spaces, create-page, update-page')
    } else {
      logger.info(
        'Registered tools: open-page, search-pages, list-pages-of-space, list-spaces, create-page, update-page',
      )
    }
  },
})
