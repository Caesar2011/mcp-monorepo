#!/usr/bin/env node

import { createMcpServer } from '@mcp-monorepo/shared'

import { registerInstallTool } from './tools/install.js'
import { registerListScriptsTool } from './tools/list-scripts.js'
import { registerRunTool } from './tools/run.js'

createMcpServer({
  name: 'npm',
  importMetaPath: import.meta.filename,
  title: 'NPM MCP Server',
  tools: [registerListScriptsTool, registerRunTool, registerInstallTool],
})
