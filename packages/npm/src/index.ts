#!/usr/bin/env node

import { createMcpServer, logger } from '@mcp-monorepo/shared'

import { getWorkingDirectory, initializeWorkingDirectory } from './lib/project-context.js'
import { registerInstallTool } from './tools/install.js'
import { registerListScriptsTool } from './tools/list-scripts.js'
import { registerRunTool } from './tools/run.js'

createMcpServer({
  name: 'npm',
  importMetaPath: import.meta.filename,
  title: 'NPM MCP Server',
  tools: [registerListScriptsTool, registerRunTool, registerInstallTool],
  async onReady() {
    initializeWorkingDirectory()
    logger.info(`NPM server initialized with working directory: ${getWorkingDirectory()}`)
  },
})
