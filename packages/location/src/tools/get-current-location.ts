import { registerTool } from '@mcp-monorepo/shared'

import { fetchIpAdress } from '../lib/fetch-ip-adress.js'
import { formatter, OutputSchema } from '../lib/format-output.js'
import { getCurrentIpAddress } from '../lib/ip-utils.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerGetCurrentLocationTool = (server: McpServer) =>
  registerTool(server, {
    name: 'get-current-location',
    title: 'Get Current Location',
    description: 'Get current location information based on current IP address.',
    inputSchema: {},
    outputSchema: OutputSchema,
    isReadOnly: true,
    async fetcher() {
      const currentIp = await getCurrentIpAddress()
      return await fetchIpAdress(currentIp)
    },
    formatter: formatter,
  })
