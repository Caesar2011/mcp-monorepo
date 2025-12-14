import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { fetchIpAdress } from '../lib/fetch-ip-adress.js'
import { formatter, OutputSchema } from '../lib/format-output.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerGetLocationByIpTool = (server: McpServer) =>
  registerTool(server, {
    name: 'get-location-by-ip',
    title: 'Get Location by IP',
    description: 'Get location information for a given IP address.',
    inputSchema: {
      ipAddress: z.string().describe('IP address to lookup location information.'),
    },
    outputSchema: OutputSchema,
    isReadOnly: true,
    async fetcher({ ipAddress }) {
      return await fetchIpAdress(ipAddress)
    },
    formatter: formatter,
  })
