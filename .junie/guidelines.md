# MCP Development Guidelines

## Project Overview

MCP (Model Context Protocol) server development project with TypeScript. This project provides MCP servers only - no frontend or Electron components.

## Technology Stack

- **TypeScript**: Type-safe JavaScript development
- **Vitest**: Fast unit testing framework with TypeScript support
- **Zod**: Runtime type validation for parameters
- **MCP SDK**: Model Context Protocol implementation

## Project Architecture

MCP projects follow a monorepo structure with individual packages for each MCP implementation.

### Package Structure

```
packages/
├── <mcp-name>/ # Individual MCP package
│ └── src/
│   ├── index.ts # Tool bundling & MCP server setup
│   ├── lib/ # MCP-specific shared code
│   └── <tool-name>/ # Individual tool implementation
│     ├── index.ts # Tool registration & parameter definition
│     ├── handler.ts # Callback implementation (flat, minimal logic)
│     ├── helper.ts # Business logic implementation
│     ├── formatter.ts # Output formatting only
│     └── types.ts # Tool-specific TypeScript types
```

### File Responsibilities & Content Structure

#### MCP Level (`./packages/<mcp-name>/src/`)

**`index.ts`**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerGetCurrentLocationTool } from './get-current-location/index.js'
import { registerGetLocationByIpTool } from './get-location-by-ip/index.js'

// MCP server creation and description
export const server = new McpServer({
  name: '<mcp-name>-server',
  version: '1.0.0',
  description: 'Server description...',
})

// Register all tools
registerGetCurrentLocationTool(server)
registerGetLocationByIpTool(server)

// Transport and connection setup
const transport = new StdioServerTransport()
server.connect(transport).then(() => {
  console.log('Server connected')
})

// Process signal handlers
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
```

#### Tool Level (`./packages/<mcp-name>/src/<tool-name>/`)

**`index.ts`** (Tool Registration)

```typescript
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { toolHandler } from './handler.js'
import type { ToolInputSchema } from './types.js'

export function registerTool(server: McpServer): void {
  server.registerTool(
    'tool-name',
    {
      title: 'Tool Title',
      description: 'Tool description for AI understanding',
      inputSchema: {
        param1: z.string().describe('Parameter description'),
      },
    },
    toolHandler,
  )
}
```

**`handler.ts`** (Callback Implementation)

```typescript
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { validateInput, processData } from './helper.js'
import { formatResponse, formatError } from './formatter.js'
import type { ToolParams, ProcessedData } from './types.js'

export const toolHandler = async (params: ToolParams): Promise<CallToolResult> => {
  try {
    // Minimal logic - orchestrate helper and formatter calls
    const validatedParams = validateInput(params)
    const data = await processData(validatedParams)
    const formattedResponse = formatResponse(data)

    return {
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    }
  } catch (error) {
    const errorMessage = formatError(error)
    return {
      content: [
        {
          type: 'text',
          text: errorMessage,
          // only add _meta if error stacktrace or detailed/original error is present
          _meta: { stderr: error.message },
        },
      ],
    }
  }
}
```

**`helper.ts`** (Business Logic)

```typescript
import type { ToolParams, ValidatedParams, ProcessedData, ExternalApiResponse } from './types.js'

// Input validation
export const validateInput = (params: ToolParams): ValidatedParams => {
  // Validation logic only
  if (!params.requiredField) {
    throw new Error('Required field missing')
  }
  return params as ValidatedParams
}

// External API calls
export const fetchExternalData = async (param: string): Promise<ExternalApiResponse> => {
  // External API logic
  const response = await fetch(`https://api.example.com/${param}`)
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  return await response.json()
}

// Data processing
export const processData = async (params: ValidatedParams): Promise<ProcessedData> => {
  // Pure business logic
  const rawData = await fetchExternalData(params.param1)
  return {
    processed: true,
    result: rawData.data,
    timestamp: new Date().toISOString(),
  }
}

// Utility functions
export const isValidFormat = (input: string): boolean => {
  // Validation helper
  return /^[a-zA-Z0-9]+$/.test(input)
}
```

**`formatter.ts`** (Output Formatting)

```typescript
import type { ProcessedData, FormattedResponse } from './types.js'

// Main response formatting
export const formatResponse = (data: ProcessedData): string => {
  // Pure formatting logic only
  const header = formatHeader(data)
  const body = formatBody(data)
  const footer = formatFooter(data)

  return `${header}\n\n${body}\n\n${footer}`
}

// Error formatting
export const formatError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  return `Error: ${message}`
}

// Internal formatting helpers (non-exported)
const formatHeader = (data: ProcessedData): string => {
  return `Results for: ${data.result}`
}

const formatBody = (data: ProcessedData): string => {
  return `Processed: ${data.processed}`
}

const formatFooter = (data: ProcessedData): string => {
  return `Generated: ${data.timestamp}`
}
```

**`types.ts`** (Type Definitions)

```typescript
// Input types
export interface ToolParams {
  param1: string
  param2?: number
}

export interface ValidatedParams extends ToolParams {
  param1: string // Now guaranteed to exist
}

// External API types
export interface ExternalApiResponse {
  data: string
  status: 'success' | 'error'
  metadata?: Record<string, unknown>
}

// Processing types
export interface ProcessedData {
  processed: boolean
  result: string
  timestamp: string
}

// Output types
export interface FormattedResponse {
  content: string
  metadata?: Record<string, unknown>
}

// Error types
export type ToolError = {
  code: string
  message: string
  details?: unknown
}
```

#### Shared Code Structure

**`./packages/<mcp-name>/src/lib/`**

- MCP-specific shared code
- Used by multiple tools within the same MCP
- If code is shared over multiple MCPs each has their own implementation

### Function Organization

#### Code Style Guidelines

- **Efficient but readable code**: Write concise, performant code that remains clear and maintainable
- **Formatters**: Keep formatting functions simple and direct. Avoid excessive verbosity while maintaining readability
- **Single responsibility**: Each function should have one clear purpose
- **Avoid over-engineering**: Choose simple, straightforward solutions over complex abstractions when possible

**Formatter Example (Efficient & Readable):**

```typescript
export const formatResponse = (data: ProcessedData): string => {
  const parts = [data.title, data.description, `Updated: ${data.timestamp}`].filter(Boolean)
  return parts.join('\n')
}
```

- **One function per file**: Each exported function gets its own file
- **Non-exported functions**: Can be in the same file as the main exported function
- **Modular design**: Functions must be easily testable and have single responsibilities
- **File size limit**: Maximum 200 lines per file (guideline for AI readability)

### Testing Requirements

#### Vitest Configuration

**Project Root Configuration:**

- Use a single `vitest.config.ts` at project root level
- Define test projects using `test.projects` configuration:

```typescript
export default defineConfig({
  test: {
    projects: [
      {
        name: 'ics',
        root: './packages/ics',
      },
      {
        name: 'location',
        root: './packages/location',
      },
    ],
  },
})
```

**Package Level:**

- Each package needs its own `tsconfig.json` with `"composite": true`

**Test Coverage with Vitest:**

- `./packages/<mcp-name>/src/lib/**/*.ts` - All shared MCP code
- `./packages/<mcp-name>/src/<tool-name>/helper.ts` - All business logic
- `./packages/<mcp-name>/src/<tool-name>/formatter.ts` - All formatting logic
- `./packages/<mcp-name>/src/<tool-name>/handler.ts` - All callback logic

**Testing Guidelines:**

- Test all edge cases
- Use comprehensive mocks for dependencies
- Ensure functions are modular enough for isolated testing
- Leverage TypeScript for compile-time safety

## Typing Conventions

### General Guidelines

- **Use very strict types, never use `any`**
- **Prefer `unknown` over `any` in all cases**
- Use TypeScript interfaces and types to define data structures
- Use generics for reusable components and functions
- Define explicit return types for functions
- Use union types instead of `any` when a variable can have multiple types
- Use type guards to narrow types when necessary

### MCP-Specific Patterns

#### Parameter Validation

- Use Zod schemas for runtime parameter validation
- Define TypeScript types that match Zod schemas
- Validate all tool inputs at the handler level

#### Tool Registration

- Use consistent naming patterns for tools
- Provide comprehensive tool descriptions
- Define clear parameter schemas with validation
- **IMPORTANT**: Use `z` from `zod` to define input schemas in tool registration, not plain objects. Use `inputSchema: z.object({...})` format

## Best Practices

### Error Handling

- Use try/catch for async operations with meaningful error messages
- Return structured error responses from tools
- Log errors appropriately for debugging

### Performance

- Cache expensive operations when appropriate
- Use streaming for large data responses
- Implement proper timeouts for external API calls

### Code Organization

- Single responsibility per file with clear naming conventions
- Group related functionality and use index files
- Keep business logic separate from MCP protocol handling

### Testing

- Use **Vitest** as the primary testing framework for unit tests
- Unit test critical functionality with comprehensive mocks for dependencies
- Test edge cases and use TypeScript for compile-time checks
- Leverage Vitest's built-in TypeScript support and fast execution

## Areas for Improvement

### Type Safety

- Continue avoiding `any` type, prefer `unknown`
- Use type guards over type assertions
- Consider branded types for enhanced safety

### Code Organization

- Use shared types directory for cross-MCP interfaces
- Create more shared utilities for common functionality

### Performance

- Implement caching and memoization
- Optimize data processing and API calls

## After Junie Instructions

- Always run tests after implementing instructions to ensure your changes don't break existing functionality
- Run `npm test` to verify unit tests pass
- Run `npm run typecheck` to verify types are strict enough
- Fix any failing tests before submitting your changes
- Abort if it does not work after two iterations of fixes
- Run `npm run lint` to re-format all code when finished
