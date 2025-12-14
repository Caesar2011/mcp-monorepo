import { readFile, writeFile } from 'node:fs/promises'
import { normalize, resolve } from 'node:path'

import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getWorkingDir } from '../lib/env.js'
import { findPatchPositions } from '../lib/find-best-patch-match.js'
import { validateWithinBasePath } from '../lib/validators.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerPatchFileTool = (server: McpServer) =>
  registerTool(server, {
    name: 'patch-file',
    title: 'Patch File',
    description:
      'Apply a patch to a file by replacing content between approximate start and end line numbers with context matching. Provide at least one line of unmodified content before and after the change.',
    inputSchema: {
      path: z.string().nonempty('File path must be provided'),
      patch: z.string().nonempty('Patch content must be provided'),
      approxStartLine: z.number().int().min(1).describe('Approximate start line number of the patch'),
      approxEndLine: z
        .number()
        .int()
        .min(1)
        .describe('Approximate end line number of the patch. Must be equal or greater than start line.'),
    },
    outputSchema: {
      actualStartPos: z.number(),
      actualEndPos: z.number(),
      startContextLength: z.number(),
      endContextLength: z.number(),
      bytesWritten: z.number(),
    },
    isReadOnly: false,
    async fetcher({ path, patch, approxStartLine, approxEndLine }) {
      const workingDir = getWorkingDir()
      const fullPath = resolve(workingDir, normalize(path))
      validateWithinBasePath(workingDir, fullPath)

      // Read the current file content
      const fileContent = await readFile(fullPath, 'utf-8')

      // Find the patch positions using the provided function
      const { patchStartPos, patchEndPos } = findPatchPositions(fileContent, patch, approxStartLine, approxEndLine)

      if (!patchStartPos || !patchEndPos) {
        throw new Error(
          `Could not find suitable patch positions. Start found: ${!!patchStartPos}, End found: ${!!patchEndPos}`,
        )
      }

      const actualStartPos = patchStartPos.bestMatchPos
      const actualEndPos = patchEndPos.bestMatchPos
      const startContextLength = patchStartPos.maxOverlap
      const endContextLength = patchEndPos.maxOverlap

      // Validate minimum distance requirement
      if (actualEndPos - actualStartPos < 5) {
        throw new Error(
          `Derived actual start (${actualStartPos}) and end (${actualEndPos}) positions are less than 5 characters apart`,
        )
      }

      // Validate minimum context length requirements
      if (startContextLength < 5) {
        throw new Error(`Start context length (${startContextLength}) is less than 5 characters`)
      }

      if (endContextLength < 5) {
        throw new Error(`End context length (${endContextLength}) is less than 5 characters`)
      }

      // Apply the patch by replacing content between the found positions
      const beforePatch = fileContent.slice(0, actualStartPos)
      const afterPatch = fileContent.slice(actualEndPos)
      const newContent = beforePatch + patch + afterPatch

      // Write the patched content back to the file
      await writeFile(fullPath, newContent, 'utf-8')

      return {
        actualStartPos,
        actualEndPos,
        startContextLength,
        endContextLength,
        bytesWritten: Buffer.byteLength(newContent, 'utf-8'),
      }
    },
    formatter({ actualStartPos, actualEndPos, startContextLength, endContextLength, bytesWritten }) {
      return {
        actualStartPos,
        actualEndPos,
        startContextLength,
        endContextLength,
        bytesWritten,
      }
    },
  })
