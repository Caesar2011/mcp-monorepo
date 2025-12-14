process.env.APP_NAME = 'confluence'

import { createMcpServer } from '@mcp-monorepo/shared'

import { registerCreatePageTool } from './tools/create-page.js'
import { registerListSpacePagesTool } from './tools/list-pages-of-space.js'
import { registerListSpacesTool } from './tools/list-spaces.js'
import { registerOpenPageTool } from './tools/open-page.js'
import { registerSearchCqlTool } from './tools/search-cql.js'
import { registerUpdatePageTool } from './tools/update-page.js'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

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
})
