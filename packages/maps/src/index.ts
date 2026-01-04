#!/usr/bin/env node

import { createMcpServer, logger } from '@mcp-monorepo/shared'

import { initializeApiClients } from './lib/api-client.js'
import { initializeApiKey } from './lib/config.js'
import { registerBulkGeocodeTool } from './tools/bulk-geocode.js'
import { registerGeocodeTool } from './tools/geocode.js'
import { registerIsochroneTool } from './tools/isochrone.js'
import { registerRouteOverviewTool } from './tools/route-overview.js'
import { registerTimeAndZoneInfoTool } from './tools/time-and-zone-info.js'

createMcpServer({
  name: 'maps',
  importMetaPath: import.meta.filename,
  title: 'Stadia Maps MCP Server',
  tools: [
    registerTimeAndZoneInfoTool,
    registerGeocodeTool,
    registerBulkGeocodeTool,
    registerRouteOverviewTool,
    registerIsochroneTool,
    // TODO image output not supported yet
    //registerStaticMapTool,
  ],
  async onReady() {
    // Validate the API key is present before initializing clients.
    initializeApiKey()
    // Initialize the API clients which depend on the key.
    initializeApiClients()
    logger.info('Stadia Maps server successfully initialized.')
  },
})
