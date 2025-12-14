import { createMcpServer } from '@mcp-monorepo/shared'

import { registerGetCurrentLocationTool } from './tools/get-current-location.js'
import { registerGetLocationByIpTool } from './tools/get-location-by-ip.js'

createMcpServer({
  name: 'location',
  importMetaPath: import.meta.filename,
  title: 'Location MCP Server',
  tools: [registerGetCurrentLocationTool, registerGetLocationByIpTool],
})
