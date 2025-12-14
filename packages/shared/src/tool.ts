import { z, type ZodRawShape } from 'zod'

import { logger } from './syslog/client.js'
import { type MaybePromise, type SchemaTypeOf } from './types.js'

import type { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js'
import type { CallToolResult, ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js'

const USE_STRUCTURED_CONTENT = process.env.USE_STRUCTURED_CONTENT === 'true'

function trimParams(params: Record<string, unknown>, depth = 2): Record<string, unknown> {
  const trimmed: Record<string, unknown> = {}

  /* eslint-disable no-restricted-syntax */
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      trimmed[key] = value.length > 35 ? value.substring(0, 30) + '[...]' : value
    } else if (typeof value === 'symbol') {
      trimmed[key] = String(value)
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      trimmed[key] = value
    } else if (Array.isArray(value)) {
      trimmed[key] =
        depth > 1
          ? value.map((v) =>
              typeof v === 'object' && v !== null ? trimParams(v as Record<string, unknown>, depth - 1) : v,
            )
          : '[array]'
    } else if (typeof value === 'object' && value !== null) {
      trimmed[key] = depth > 1 ? trimParams(value as Record<string, unknown>, depth - 1) : '[object]'
    } else if (typeof value === 'function') {
      trimmed[key] = '[function]'
    } else {
      trimmed[key] = value
    }
  }
  /* eslint-enable no-restricted-syntax */

  return trimmed
}

function returnStructuredContent<InputArgs extends ZodRawShape>(
  content: SchemaTypeOf<InputArgs>,
  params: Record<string, unknown>,
): CallToolResult {
  return {
    ...returnTextContent<InputArgs>(content, params),
    structuredContent: content,
  }
}

function returnTextContent<InputArgs extends ZodRawShape>(
  content: SchemaTypeOf<InputArgs>,
  params: Record<string, unknown>,
): CallToolResult {
  return {
    name: '',
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          request: trimParams(params),
          response: content,
        }),
      },
    ],
  }
}

export function registerTool<T, InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape>(
  server: McpServer,
  config: {
    name: string
    title: string
    description: string
    inputSchema: InputArgs
    outputSchema: OutputArgs
    isReadOnly?: boolean
    isDestructive?: boolean
    isIdempotent?: boolean
    isOpenWorld?: boolean
    fetcher: (args: SchemaTypeOf<InputArgs>) => MaybePromise<T>
    formatter: (args: T) => MaybePromise<SchemaTypeOf<OutputArgs>>
  },
) {
  server.registerTool<OutputArgs, InputArgs>(
    config.name,
    {
      title: config.title,
      description: config.description,
      inputSchema: config.inputSchema,
      outputSchema: USE_STRUCTURED_CONTENT
        ? {
            success: z.boolean(),
            ...config.outputSchema,
          }
        : undefined,
      annotations: {
        title: config.title,
        readOnlyHint: config.isReadOnly,
        destructiveHint: config.isDestructive,
        idempotentHint: config.isIdempotent,
        openWorldHint: config.isOpenWorld,
      },
    },
    (async (args: SchemaTypeOf<InputArgs>, _extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
      const returner = USE_STRUCTURED_CONTENT ? returnStructuredContent : returnTextContent
      try {
        const result = await config.fetcher(args)
        const formatted = await config.formatter(result)
        return returner(
          {
            success: true,
            ...formatted,
          },
          args,
        )
      } catch (e) {
        logger.error(e)
        return returner(
          {
            success: false,
            error: e instanceof Error ? e.message : String(e),
          },
          args,
        )
      }
    }) as ToolCallback<InputArgs>,
  )
}
