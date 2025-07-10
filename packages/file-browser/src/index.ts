import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { registerFindTool } from './find/index.js'
import { registerGrepTool } from './grep/index.js'
import { registerGrepReplaceTool } from './grep-replace/index.js'
import { registerLsTool } from './ls/index.js'
import { registerMkDirTool } from './mk-dir/index.js'
import { registerMvTool } from './mv/index.js'
import { registerOpenTool } from './open/index.js'
import { registerPatchFileTool } from './patch-file/index.js'
import { registerRmTool } from './rm/index.js'
import { registerTreeTool } from './tree/index.js'
import { registerWriteTool } from './write/index.js'

export const server = new McpServer({
  name: 'file-browser-mcp-server',
  version: '1.0.0',
  description: 'A server to interact with file system operations (search, ls, tree, grep, open, write, move, mkdir).',
})

registerFindTool(server)
registerGrepTool(server)
registerGrepReplaceTool(server)
registerOpenTool(server)
registerLsTool(server)
registerTreeTool(server)
registerRmTool(server)
registerMvTool(server)
registerPatchFileTool(server)
registerMkDirTool(server)
registerWriteTool(server)

const transport = new StdioServerTransport()
server.connect(transport).then(() => {
  console.log('Server connected')
})

// Process signal handlers
process.on('SIGINT', async () => {
  console.log('SIGINT received, disconnecting server...')
  await server.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, disconnecting server...')
  await server.close()
  process.exit(0)
})
