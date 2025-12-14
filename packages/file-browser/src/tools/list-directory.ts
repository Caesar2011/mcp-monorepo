import { stat } from 'node:fs/promises'
import os from 'node:os'
import { basename, normalize, resolve } from 'node:path'

import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getWorkingDir } from '../lib/env.js'
import { validateIsDir, validateWithinBasePath } from '../lib/validators.js'
import { type StatType, traverseDirectoryBFS } from '../lib/walker/better-walker.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerListDirectoryTool = (server: McpServer) =>
  registerTool(server, {
    name: 'list-directory',
    title: 'List Directory Contents',
    description: 'Lists the contents of a directory with details.',
    inputSchema: {
      dirpath: z.string().optional().describe('Relative path to the directory. Defaults to current working directory.'),
    },
    outputSchema: {
      content: z.array(
        z.object({
          name: z.string(),
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
          size: z.number(),
          permissions: z.string().optional(),
        }),
      ),
      total: z.number(),
      message: z.string().optional(),
    },
    isReadOnly: true,
    async fetcher({ dirpath }) {
      const workingDir = getWorkingDir()
      const basePath = resolve(workingDir, normalize(dirpath ?? './'))
      validateWithinBasePath(workingDir, basePath)
      await validateIsDir(basePath)

      const files: { relPath: string; type: StatType }[] = []
      let isLimited = false
      for await (const filePath of traverseDirectoryBFS({
        absoluteFolderPath: basePath,
        maxDepth: 1,
      })) {
        files.push(filePath)
        if (files.length > 200) {
          isLimited = true
          break
        }
      }
      return { files, basePath, isLimited }
    },
    async formatter({ files, basePath, isLimited }) {
      const content = await Promise.all(
        files.map(async ({ relPath, type }) => {
          const stats = await stat(resolve(basePath, normalize(relPath)))
          const isUnix = os.platform() !== 'win32'
          return {
            name: basename(relPath),
            type,
            size: stats.size,
            permissions: isUnix ? `0${(stats.mode & 0o777).toString(8)}` : undefined,
          } as const
        }),
      )
      return {
        content,
        total: files.length,
        message: isLimited
          ? 'Number of items exceedeed 200. Results limited in depth. Try a more narrow scope with another dirpath or regex filter.'
          : undefined,
      }
    },
  })
