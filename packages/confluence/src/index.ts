#!/usr/bin/env node

import { createMcpServer, logger } from '@mcp-monorepo/shared'

import { getConfluenceAuthMode, getConfluenceBaseUrl } from './lib/confluence-env.js'
import { registerCreatePageTool } from './tools/create-page.js'
import { registerListSpacePagesTool } from './tools/list-pages-of-space.js'
import { registerListSpacesTool } from './tools/list-spaces.js'
import { registerOpenPageTool } from './tools/open-page.js'
import { registerSearchCqlTool } from './tools/search-cql.js'
import { registerUpdatePageTool } from './tools/update-page.js'

createMcpServer({
  name: 'confluence',
  importMetaPath: import.meta.filename,
  title: 'Confluence MCP Server',
  tools: [
    registerOpenPageTool,
    registerSearchCqlTool,
    registerListSpacePagesTool,
    registerListSpacesTool,
    registerCreatePageTool,
    registerUpdatePageTool,
  ],
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
  },
})
