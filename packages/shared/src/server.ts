import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { logger } from './syslog/client.js'
import { type MaybePromise } from './types.js'
import { getPackageJson, IS_TOOL_ADVISORY_ONLY } from './utils.js'

export async function createMcpServer(serverOptions: {
  name: string
  importMetaPath: string
  title: string
  tools: ((server: McpServer) => MaybePromise<void>)[]
  onReady?: () => MaybePromise<void>
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
  server.connect(transport).then(() => {
    logger.info(`Server "${serverOptions.name}" connected`)
    if (!IS_TOOL_ADVISORY_ONLY) {
      Promise.resolve(serverOptions.onReady?.()).catch((err) => {
        logger.error('Error during onReady execution:', err)
        process.exit(1)
      })
    } else {
      logger.warn('Running in TOOL_ADVISORY_ONLY mode. Skipping onReady hooks.')
    }
  })

  const shutdown = async (signal: string) => {
    logger.error(`${signal} received, disconnecting server "${serverOptions.name}"...`)
    if (!IS_TOOL_ADVISORY_ONLY) {
      await serverOptions.onClose?.()
    }
    await server.close()
    await transport.close()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}
