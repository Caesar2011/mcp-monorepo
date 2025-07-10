import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { registerInstallTool } from './install/index.js'
import { registerListScriptsTool } from './list-scripts/index.js'
import { registerRunTool } from './run/index.js'

export const server = new McpServer({
  name: 'npm-mcp-server',
  version: '1.0.0',
  description: 'A server to interact with npm commands (run scripts, install packages, list scripts).',
})

registerListScriptsTool(server)
registerRunTool(server)
registerInstallTool(server)

const transport = new StdioServerTransport()
server.connect(transport).then(() => {
  console.log('npm-mcp-server connected and listening on stdio.')
})

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
