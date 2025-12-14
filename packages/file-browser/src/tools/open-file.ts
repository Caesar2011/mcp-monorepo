import { readFile } from 'node:fs/promises'
import { normalize, resolve } from 'node:path'

import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getWorkingDir } from '../lib/env.js'
import { validateIsFile, validateWithinBasePath } from '../lib/validators.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerOpenFileTool = (server: McpServer) =>
  registerTool(server, {
    name: 'open-file',
    title: 'Open File',
    description: 'Opens a file by its relative filepath and returns its content.',
    inputSchema: {
      filepath: z.string().nonempty('Filepath must be provided'),
    },
    outputSchema: {
      content: z.string(),
    },
    isReadOnly: true,
    async fetcher({ filepath }) {
      const workingDir = getWorkingDir()
      const path = resolve(workingDir, normalize(filepath))
      validateWithinBasePath(workingDir, path)
      await validateIsFile(path)

      return await readFile(path, 'utf-8')
    },
    formatter(content) {
      return {
        content,
      }
    },
  })
