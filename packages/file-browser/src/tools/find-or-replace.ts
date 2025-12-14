import { readFile, writeFile } from 'node:fs/promises'
import { posix, resolve } from 'node:path'

import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import { getWorkingDir } from '../lib/env.js'
import { getFormattedSubstring } from '../lib/finder.js'
import { validateWithinBasePath } from '../lib/validators.js'
import { traverseDirectoryBFS } from '../lib/walker/better-walker.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

interface MatchResult {
  filePath: string
  matches: {
    lineNumber: number
    string: string
  }[]
}

export const registerFindOrReplaceTool = (server: McpServer) =>
  registerTool(server, {
    name: 'find-or-replace',
    title: 'Find or Replace Text in Files',
    description:
      'Search for text patterns in files with optional replacement. Supports multi-line matches and provides context.',
    inputSchema: {
      dirpath: z
        .string()
        .optional()
        .describe('Relative path to search directory. Defaults to current working directory.'),
      fileRegexp: z.string().optional().describe('Regexp to filter file paths (e.g. ".*\\.ts$" for TypeScript files).'),
      searchRegexp: z
        .string()
        .describe(
          'Regexp pattern to search for in file contents. Can span multiple lines. The flags "gms" will be used.',
        ),
      replaceString: z
        .string()
        .optional()
        .describe(
          'Replacement string. Use $1, $2, etc. for capture groups. If provided, performs replacement instead of showing matches.',
        ),
    },
    outputSchema: {
      matches: z
        .array(
          z.object({
            filePath: z.string(),
            matches: z.array(
              z.object({
                lineNumber: z.number(),
                string: z.string(),
              }),
            ),
          }),
        )
        .optional(),
      message: z.string(),
      totalMatches: z.number(),
      filesProcessed: z.number(),
    },
    isReadOnly: false,
    async fetcher({ dirpath, fileRegexp, searchRegexp, replaceString }) {
      const workingDir = getWorkingDir()
      const basePath = resolve(workingDir, dirpath ? posix.normalize(dirpath) : './')
      validateWithinBasePath(workingDir, basePath)

      const fileRegex = fileRegexp ? new RegExp(fileRegexp, 'i') : undefined
      const searchRegex = new RegExp(searchRegexp, 'gms') // global, multiline, dotall

      const matchResults: MatchResult[] = []
      const LIMIT = replaceString !== undefined ? Infinity : 200
      let isLimited = false
      for await (const { relPath, type } of traverseDirectoryBFS({
        absoluteFolderPath: basePath,
      })) {
        const totalMatches = matchResults.map((m) => m.matches.length).reduce((a, b) => a + b, 0)
        if (totalMatches > LIMIT) {
          isLimited = true
          break
        }
        if (type === 'file') {
          if (!fileRegex || fileRegex.test(relPath)) {
            const fullPath = resolve(basePath, relPath)
            const content = await readFile(fullPath, 'utf-8')
            const matches = [...content.matchAll(searchRegex)]
            if (matches.length > 0) {
              matchResults.push({
                filePath: relPath,
                matches: matches.map((m) => ({
                  lineNumber: m.index,
                  string: m[0],
                  context: getFormattedSubstring(content, m.index, m.index + m[0].length),
                })),
              })
              if (replaceString !== undefined) {
                const newContent = content.replace(searchRegex, replaceString)
                if (newContent !== content) {
                  await writeFile(fullPath, newContent, 'utf-8')
                }
              }
            }
          }
        }
      }

      return {
        matches: matchResults,
        isLimited,
        isReplaceMode: replaceString !== undefined,
        limit: LIMIT,
      }
    },
    async formatter({ matches, isLimited, isReplaceMode, limit }) {
      const totalMatches = matches.map((m) => m.matches.length).reduce((a, b) => a + b, 0)
      const filesProcessed = matches.length
      const action = isReplaceMode ? 'Found and replaced' : 'Found'
      return {
        message: `${action} ${totalMatches} occurrence${totalMatches !== 1 ? 's' : ''} in ${filesProcessed} file${filesProcessed !== 1 ? 's' : ''}.${isLimited ? ` Results exceeded ${limit} matches. Try a more narrow scope with another dirpath or regex filter to find more matched.` : ''}`,
        totalMatches,
        filesProcessed,
        matches: isReplaceMode ? undefined : matches,
      }
    },
  })
