#!/usr/bin/env node

import { createMcpServer } from '@mcp-monorepo/shared'

import { registerFindOrReplaceTool } from './tools/find-or-replace.js'
import { registerListDirectoryTool } from './tools/list-directory.js'
import { registerMkDirTool } from './tools/mk-dir.js'
import { registerMovePathTool } from './tools/move-path.js'
import { registerOpenFileTool } from './tools/open-file.js'
import { registerPatchFileTool } from './tools/patch-file.js'
import { registerRemoveFileTool } from './tools/remove-file.js'
import { registerTreeDirectoryTool } from './tools/tree-directory.js'

createMcpServer({
  name: 'file-browser',
  importMetaPath: import.meta.filename,
  title: 'File Browser MCP Server',
  tools: [
    registerOpenFileTool,
    registerMovePathTool,
    registerListDirectoryTool,
    registerTreeDirectoryTool,
    registerMkDirTool,
    registerRemoveFileTool,
    registerFindOrReplaceTool,
    registerPatchFileTool,
  ],
})
