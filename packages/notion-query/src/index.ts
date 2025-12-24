#!/usr/bin/env node

import { createMcpServer } from '@mcp-monorepo/shared'

import { registerCreatePagesTool } from './tools/create-pages.js'
import { registerFetchTool } from './tools/fetch.js'
import { registerQueryDatasourceTool } from './tools/query-datasource.js'

createMcpServer({
  name: 'notion-query',
  importMetaPath: import.meta.filename,
  title: 'Notion Query MCP Server',
  tools: [registerQueryDatasourceTool, registerFetchTool, registerCreatePagesTool],
})
