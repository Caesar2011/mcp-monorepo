import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  storeShortTermHandler,
  storeMidTermHandler,
  storeLongTermHandler,
  removeLongTermHandler,
  searchMemoriesHandler,
  getAllMemoriesHandler,
} from './handler.js'
import { z } from 'zod'

// Zod schemas for input validation
const StoreMemorySchema = {
  memory: z.string().min(1, 'Memory content cannot be empty'),
  category: z.string().optional(),
}

const RemoveMemorySchema = {
  id: z.number().int().positive('ID must be a positive integer'),
}

const SearchMemorySchema = {
  keyword: z.string().min(1, 'Search keyword cannot be empty'),
}

const EmptyArgsSchema = {}

// Create an MCP server instance
const server = new McpServer({
  name: 'memory-mcp-server',
  version: '1.0.0',
  description:
    'A comprehensive memory management system that automatically stores and retrieves personal preferences, decisions, moods, and plans across different time horizons. Short-term memories (7 days) capture moods and immediate decisions, mid-term memories (3 months) store plans and evolving preferences, while long-term memories preserve personal preferences indefinitely. Every decision you make should be stored automatically, even without explicitly asking. This tool distinguishes between memories (personal preferences, plans, moods - both personal and business) and tasks (concrete action points).',
})

// Register the "store-short-term-memory" tool
server.registerTool(
  'store-short-term-memory',
  {
    title: 'Store Short-term Memory',
    description:
      'Store memories for the next 7 days (moods, immediate decisions, temporary preferences). Examples: "Feeling stressed about project deadline", "Prefer morning meetings this week", "Avoiding caffeine today"',
    inputSchema: StoreMemorySchema,
  },
  storeShortTermHandler,
)

// Register the "store-mid-term-memory" tool
server.registerTool(
  'store-mid-term-memory',
  {
    title: 'Store Mid-term Memory',
    description:
      'Store memories for the next 3 months (plans, evolving preferences, project decisions). Examples: "Planning to learn TypeScript this quarter", "Team prefers async communication", "Working on improving code review process"',
    inputSchema: StoreMemorySchema,
  },
  storeMidTermHandler,
)

// Register the "store-long-term-memory" tool
server.registerTool(
  'store-long-term-memory',
  {
    title: 'Store Long-term Memory',
    description:
      'Store permanent memories (personal preferences, core values, fundamental decisions). Examples: "Always prefer written communication over calls", "Value work-life balance highly", "Enjoys problem-solving and technical challenges"',
    inputSchema: StoreMemorySchema,
  },
  storeLongTermHandler,
)

// Register the "remove-long-term-memory" tool
server.registerTool(
  'remove-long-term-memory',
  {
    title: 'Remove Long-term Memory',
    description:
      'Remove a long-term memory entry by its ID. Only long-term memories can be removed this way since short and mid-term memories expire automatically.',
    inputSchema: RemoveMemorySchema,
  },
  removeLongTermHandler,
)

// Register the "search-memories" tool
server.registerTool(
  'search-memories',
  {
    title: 'Search Memories',
    description:
      'Search all valid memories by a single keyword. Searches both content and category fields. Automatically cleans up expired memories before searching.',
    inputSchema: SearchMemorySchema,
  },
  searchMemoriesHandler,
)

// Register the "get-all-memories" tool
server.registerTool(
  'get-all-memories',
  {
    title: 'Get All Memories',
    description:
      'Retrieve all valid memories grouped by storage type (long-term, mid-term, short-term). Automatically cleans up expired entries and shows memory statistics.',
    inputSchema: EmptyArgsSchema,
  },
  getAllMemoriesHandler,
)

const transport = new StdioServerTransport()
server
  .connect(transport)
  .then(() => {
    console.log('memory-mcp-server connected and listening on stdio.')
  })
  .catch((error: Error) => {
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
