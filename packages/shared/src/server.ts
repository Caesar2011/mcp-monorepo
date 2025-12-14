import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { logger } from './syslog/client.js'
import { type MaybePromise } from './types.js'
import { getPackageJson } from './utils.js'

export async function createMcpServer(serverOptions: {
  name: string
  importMetaPath: string
  title: string
  tools: ((server: McpServer) => MaybePromise<void>)[]
  onClose?: () => MaybePromise<void>
}) {
  logger.setName(serverOptions.name)

  const server = new McpServer({
    name: serverOptions.name,
    version: (await getPackageJson(serverOptions.importMetaPath))?.version ?? '1.0.0',
    title: serverOptions.title,
  })

  await Promise.all(serverOptions.tools.map(async (tool) => await tool(server)))

  const transport = new StdioServerTransport()
  server.connect(transport).then(() => logger.info(`Server "${serverOptions.name}" connected`))

  process.on('SIGINT', async () => {
    logger.error(`SIGINT received, disconnecting server "${serverOptions.name}"...`)
    await server.close()
    await serverOptions.onClose?.()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    logger.error(`SIGTERM received, disconnecting server "${serverOptions.name}"...`)
    await server.close()
    await serverOptions.onClose?.()
    process.exit(0)
  })
}
