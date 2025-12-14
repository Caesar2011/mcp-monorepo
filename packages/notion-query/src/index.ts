#!/usr/bin/env node

import { createMcpServer } from '@mcp-monorepo/shared'

import { registerNotionQueryTool } from './tools/notion-query.js'

createMcpServer({
  name: 'notion-query',
  importMetaPath: import.meta.filename,
  title: 'Notion Query MCP Server',
  tools: [registerNotionQueryTool],
})
