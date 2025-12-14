#!/usr/bin/env node

import { createMcpServer } from '@mcp-monorepo/shared'

import { registerGeocodingTool } from './tools/geocoding.js'
import { registerWeatherByCoordsTool } from './tools/weather-by-coords.js'

createMcpServer({
  name: 'weather',
  importMetaPath: import.meta.filename,
  title: 'Weather MCP Server',
  tools: [registerGeocodingTool, registerWeatherByCoordsTool],
})
