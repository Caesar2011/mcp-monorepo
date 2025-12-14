import { rm, stat } from 'node:fs/promises'
import { normalize, resolve } from 'node:path'

import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getWorkingDir } from '../lib/env.js'
import { validateExists, validateWithinBasePath } from '../lib/validators.js'
import { getTypeFromStats } from '../lib/walker/better-walker.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerRemoveFileTool = (server: McpServer) =>
  registerTool(server, {
    name: 'remove-file',
    title: 'Remove File',
    description: 'Removes a file or directory. For directories, removes recursively including all contents.',
    inputSchema: {
      filepath: z.string().nonempty('Filepath must be provided'),
    },
    outputSchema: {
      removed: z.string(),
      type: z.enum([
        'file',
        'folder',
        'block device',
        'character device',
        'FIFO',
        'socket',
        'symbolic link',
        'unknown',
      ]),
    },
    isReadOnly: false,
    isDestructive: true,
    async fetcher({ filepath }) {
      const workingDir = getWorkingDir()
      const path = resolve(workingDir, normalize(filepath))
      validateWithinBasePath(workingDir, path)
      await validateExists(path)

      // Check if it's a file or directory before removal
      const stats = await stat(path)
      const type = getTypeFromStats(stats)

      // Remove file or directory recursively
      await rm(path, { recursive: true, force: true })

      return {
        removed: filepath,
        type,
      }
    },
    formatter({ removed, type }) {
      return {
        removed,
        type,
      }
    },
  })
