import { stat, writeFile } from 'node:fs/promises'
import { mkdir } from 'node:fs/promises'
import { dirname, normalize, resolve } from 'node:path'

import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getWorkingDir } from '../lib/env.js'
import { validateWithinBasePath } from '../lib/validators.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerWriteFileTool = (server: McpServer) =>
  registerTool(server, {
    name: 'write-file',
    title: 'Write File',
    description:
      "Create or completely overwrite a file with new content. Creates parent directories if they don't exist.",
    inputSchema: {
      filepath: z.string().nonempty('Filepath must be provided'),
      content: z.string().describe('Content to write to the file'),
    },
    outputSchema: {
      bytesWritten: z.number(),
      existed: z.boolean(),
    },
    isReadOnly: false,
    async fetcher({ filepath, content }) {
      const workingDir = getWorkingDir()
      const path = resolve(workingDir, normalize(filepath))
      validateWithinBasePath(workingDir, path)

      const parentDir = dirname(path)
      await mkdir(parentDir, { recursive: true })

      const existed = await stat(path)
        .then((stat) => (stat.isFile() ? true : ('existed, but not a file' as const)))
        .catch(() => false)

      if (typeof existed === 'string')
        throw new Error(`Cannot write to file ${filepath} because it already exists and is not a file.`)
      await writeFile(path, content, 'utf-8')

      return {
        existed,
        bytesWritten: Buffer.byteLength(content, 'utf-8'),
      }
    },
    formatter({ existed, bytesWritten }) {
      return {
        existed,
        bytesWritten,
      }
    },
  })
