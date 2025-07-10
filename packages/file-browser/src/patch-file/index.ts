import { z } from 'zod'

import { patchFileHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const PatchReplacementSchema = z.object({
  startLine: z.number().int().min(1).describe('Approximate start line number for the replacement'),
  endLine: z.number().int().min(1).describe('Approximate end line number for the replacement'),
  replacement: z.string().describe('Replacement string with 3 lines of context or <SOF>/<EOF> markers'),
})

export function registerPatchFileTool(server: McpServer): void {
  server.registerTool(
    'patch-file',
    {
      title: 'Patch file',
      description:
        'Update partial parts of a file and prevent rewriting a large file entirely. Apply multiple patches with context matching. Patches are applied from end to beginning to prevent line shifting.',
      inputSchema: {
        filePath: z.string().describe('Relative path to the file to patch (must exist)'),
        patches: z
          .array(PatchReplacementSchema)
          .min(1)
          .describe('List of replacements to apply (applied from end to beginning)'),
      },
    },
    patchFileHandler,
  )
}
