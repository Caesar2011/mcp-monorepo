import { rename } from 'node:fs/promises'
import { resolve, normalize } from 'node:path'

import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getWorkingDir } from '../lib/env.js'
import { validateDoesNotExists, validateExists, validateWithinBasePath } from '../lib/validators.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerMovePathTool = (server: McpServer) =>
  registerTool(server, {
    name: 'move-path',
    title: 'Move Path',
    description: 'Moves files or directories to new locations. Each source must exist, and each target must not.',
    inputSchema: {
      paths: z.array(
        z.object({
          sourcePath: z.string().nonempty('Source path must be provided'),
          targetPath: z.string().nonempty('Target path must be provided'),
        }),
      ),
    },
    outputSchema: {},
    isReadOnly: false,
    async fetcher({ paths }) {
      const workingDir = getWorkingDir()

      for (const { sourcePath, targetPath } of paths) {
        const source = resolve(workingDir, normalize(sourcePath))
        const target = resolve(workingDir, normalize(targetPath))

        validateWithinBasePath(workingDir, source)
        validateWithinBasePath(workingDir, target)
        await validateExists(source)
        await validateDoesNotExists(target)

        await rename(source, target)
      }
    },
    formatter() {
      return {}
    },
  })
