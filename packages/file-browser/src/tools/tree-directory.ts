import { posix, resolve } from 'node:path'

import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getWorkingDir } from '../lib/env.js'
import { validateIsDir, validateWithinBasePath } from '../lib/validators.js'
import { type StatType, traverseDirectoryBFS } from '../lib/walker/better-walker.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

type NestedTree = { [_: string]: NestedTree }

export const registerTreeDirectoryTool = (server: McpServer) =>
  registerTool(server, {
    name: 'tree-directory',
    title: 'Tree Directory Contents',
    description: 'Generates a nested JSON representation with optional filtering of the directory contents.',
    inputSchema: {
      dirpath: z
        .string()
        .optional()
        .describe('Relative path to the tree root directory. Defaults to current working directory.'),
      depth: z.number().min(1).optional().describe('Maximum depth to traverse'),
      regexp: z
        .string()
        .optional()
        .describe(
          'Only relative paths in unix style (e.g. "dir/to/file.txt") matching this regexp (e.g. "to/.*\\.txt") will be returned.',
        ),
    },
    outputSchema: {
      content: z.unknown(),
      total: z.number(),
      message: z.string().optional(),
    },
    isReadOnly: true,
    async fetcher({ dirpath, depth, regexp }) {
      const workingDir = getWorkingDir()
      const basePath = resolve(workingDir, dirpath ? posix.normalize(dirpath) : './')
      validateWithinBasePath(workingDir, basePath)
      await validateIsDir(basePath)

      const regex = regexp ? new RegExp(regexp, 'i') : undefined

      const files: { relPath: string; type: StatType }[] = []
      let isLimited = false
      for await (const filePath of traverseDirectoryBFS({
        absoluteFolderPath: basePath,
        maxDepth: depth,
      })) {
        if (!regex || regex.test(filePath.relPath)) files.push(filePath)
        if (files.length > 200) {
          isLimited = true
          break
        }
      }

      return { files, isLimited }
    },
    async formatter({ files, isLimited }) {
      const content: NestedTree = {}
      for (const { relPath } of files) {
        const parts = relPath.split(posix.sep)
        let current = content
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i]
          if (!current[part]) {
            current[part] = {}
          }
          current = current[part]
        }
      }
      return {
        content,
        total: files.length,
        message: isLimited
          ? 'Number of items exceedeed 200. Results limited in depth. Try a more narrow scope with another dirpath or regex filter.'
          : undefined,
      }
    },
  })
