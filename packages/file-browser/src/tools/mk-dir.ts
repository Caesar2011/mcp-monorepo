import { mkdir, stat } from 'node:fs/promises'
import { normalize, resolve } from 'node:path'

import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getWorkingDir } from '../lib/env.js'
import { validateWithinBasePath } from '../lib/validators.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerMkDirTool = (server: McpServer) =>
  registerTool(server, {
    name: 'mk-dir',
    title: 'Make Directory',
    description: 'Creates a directory and all necessary parent directories recursively.',
    inputSchema: {
      dirpath: z.string().nonempty('Directory path must be provided'),
    },
    outputSchema: {
      created: z.string(),
      existed: z.boolean(),
    },
    isReadOnly: false,
    isIdempotent: true,
    async fetcher({ dirpath }) {
      const workingDir = getWorkingDir()
      const path = resolve(workingDir, normalize(dirpath))
      validateWithinBasePath(workingDir, path)

      // Check if directory already exists

      const existed = await stat(path)
        .then((stat) => (stat.isDirectory() ? true : ('existed, but not a directory' as const)))
        .catch(() => false)

      if (typeof existed === 'string')
        throw new Error(`Cannot create directory ${dirpath} because it already exists and is not a directory.`)
      if (!existed) {
        await mkdir(path, { recursive: true })
      }

      return {
        created: dirpath,
        existed,
      }
    },
    formatter({ created, existed }) {
      return {
        created,
        existed,
      }
    },
  })
