import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {currentDatetimeHandler, fetchEventsHandler} from "./handler.js";
import { z } from 'zod'

// Create an MCP server instance
const server = new McpServer({
  name: 'calendar-mcp-server',
  version: '1.0.0',
  description: 'A server to interact with multiple ICS calendar URLs and fetch events for specified periods.',
})

// Register the "get-current-datetime" tool
server.registerTool(
  'get-current-datetime',
  {
    title: 'Get current date and time',
    description: 'Returns the current date and time in various formats.',
    inputSchema: {
      format: z
        .enum(['iso', 'local', 'utc', 'timestamp'])
        .default('local')
        .describe('Output format: iso, local, utc, or timestamp'),
    },
  },
  currentDatetimeHandler
)

// Register the "fetch-events" tool
server.registerTool(
  'fetch-events',
  {
    title: 'Fetch calendar events',
    description: 'Fetch calendar events from all configured ICS URLs for a specified time period.',
    inputSchema: {
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format'),
      limit: z.number().default(50).describe('Maximum number of events to return (default: 50)'),
    },
  },
  fetchEventsHandler
)

const transport = new StdioServerTransport()
server
  .connect(transport)
  .then(() => {
    console.log('calendar-mcp-server connected and listening on stdio.')
  })
  .catch((error) => {
    console.error('Failed to connect MCP server:', error)
    process.exit(1)
  })

// Graceful shutdown on process exit
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
