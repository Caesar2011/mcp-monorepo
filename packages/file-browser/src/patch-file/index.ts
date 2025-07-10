import { z } from 'zod'

import { patchFileHandler } from './handler.js'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const PatchReplacementSchema = z.object({
  startLine: z.number().int().min(1).describe('Approximate start line number for the replacement'),
  endLine: z.number().int().min(1).describe('Approximate end line number for the replacement'),
  replacement: z
    .string()
    .describe(
      `Full replacement text, including at least 3 lines of unchanged context both before and after the patch content.\n` +
        `If the patch is at the start or end of the file and there aren't enough context lines, use the special marker <SOF> (Start Of File) or <EOF> (End Of File) in place of those lines.\n` +
        `Minimum total lines per replacement: 6 (3 context before + patch + 3 context after, or context markers as needed).`,
    ),
})

export function registerPatchFileTool(server: McpServer): void {
  server.registerTool(
    'patch-file',
    {
      title: 'Patch file',
      description:
        `Update partial parts of a file without rewriting the entire file.\n` +
        `Each patch must provide at least 3 lines of unchanged context before and after the patch content (or use <SOF>/<EOF> markers if patching at the file start/end).\n` +
        `Patches are applied from end to beginning to prevent line shifting. If insufficient context is provided, the patch will fail with a parse error.`,
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
