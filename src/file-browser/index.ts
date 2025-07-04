// Create an MCP server instance
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  applyGitDiffHandler,
  grepHandler,
  grepReplaceHandler,
  lsHandler,
  mkdirHandler,
  moveHandler,
  openHandler,
  openMultipleHandler,
  rmHandler,
  searchHandler,
  treeHandler,
  writeHandler,
} from './handler.js'
import { isGitAvailable } from './helpers.js'

export const server = new McpServer({
  name: 'file-browser-mcp-server',
  version: '1.0.0',
  description: 'A server to interact with file system operations (search, ls, tree, grep, open, write, move, mkdir).',
})

// Register tools with handler functions
if (await isGitAvailable()) {
  server.registerTool(
    'apply-git-diff',
    {
      title: 'Apply git diff to file',
      description:
        'Apply a git diff patch to a single file. Use for small targeted changes with precise line context. Provide sufficient context lines around changes to ensure accurate matching of the code excerpt.',
      inputSchema: {
        filePath: z.string().describe('Relative path to the file to modify'),
        diff: z
          .string()
          .describe(
            'Git diff content to apply (must include sufficient context lines for accurate matching). Only apply one hunk at a time.',
          ),
      },
    },
    applyGitDiffHandler,
  )
}

server.registerTool(
  'rm',
  {
    title: 'Remove file or directory',
    description: 'Remove a file or directory relative to the working directory.',
    inputSchema: {
      targetPath: z.string().describe('Relative path to the file or directory to remove'),
    },
  },
  rmHandler,
)

server.registerTool(
  'move',
  {
    title: 'Move file or directory',
    description: 'Move/rename a file or directory from one relative path to another.',
    inputSchema: {
      sourcePath: z.string().describe('Relative path to the source file or directory'),
      destinationPath: z.string().describe('Relative path to the destination file or directory'),
    },
  },
  moveHandler,
)

server.registerTool(
  'mkdir',
  {
    title: 'Create directory',
    description: 'Create a directory at the specified relative path with recursive parent creation.',
    inputSchema: {
      dirPath: z.string().describe('Relative path to the directory to create'),
    },
  },
  mkdirHandler,
)

server.registerTool(
  'search',
  {
    title: 'Search files by name',
    description: 'Find files by name pattern in the working directory and subdirectories.',
    inputSchema: {
      pattern: z.string().describe('The file name pattern to search for (supports wildcards)'),
    },
  },
  searchHandler,
)

server.registerTool(
  'ls',
  {
    title: 'List directory contents',
    description: 'List files and directories in the current working directory.',
    inputSchema: {
      path: z.string().optional().describe('Optional subdirectory path to list (relative to working directory)'),
    },
  },
  lsHandler,
)

server.registerTool(
  'tree',
  {
    title: 'Show directory tree',
    description: 'Show all files and directories recursively with .gitignore support.',
    inputSchema: {
      depth: z.number().default(5).describe('Maximum depth to traverse (default: 5)'),
    },
  },
  treeHandler,
)

server.registerTool(
  'grep',
  {
    title: 'Search text in files',
    description: 'Search for text patterns in files and return matches with context.',
    inputSchema: {
      pattern: z.string().describe('The text pattern to search for'),
      filePattern: z.string().default('*').describe('File pattern to search in (default: all files)'),
    },
  },
  grepHandler,
)

server.registerTool(
  'grep-replace',
  {
    title: 'Search and replace text in files',
    description:
      'Search for text patterns and replace them across multiple files or multiple occurrences. Use for small changes that need to be applied consistently across multiple locations or files.',
    inputSchema: {
      pattern: z.string().describe('The regex pattern to search for'),
      replacement: z.string().describe('The replacement text (supports $1, $2 placeholders for regex groups)'),
      filePath: z.string().describe('Relative path to the file to modify'),
    },
  },
  grepReplaceHandler,
)

server.registerTool(
  'open',
  {
    title: 'Open file',
    description: 'Read and return the content of a single file.',
    inputSchema: {
      filePath: z.string().describe('Relative path to the file to open'),
    },
  },
  openHandler,
)

server.registerTool(
  'open-multiple',
  {
    title: 'Open multiple files',
    description: 'Read and return the content of multiple files (max 5).',
    inputSchema: {
      filePaths: z.array(z.string()).max(5).describe('Array of relative file paths to open (max 5 files)'),
    },
  },
  openMultipleHandler,
)

server.registerTool(
  'write',
  {
    title: 'Write to file',
    description:
      'Create or completely overwrite a file with new content. Use for major changes, refactorings, or when replacing large portions of a file where other tools would be insufficient.',
    inputSchema: {
      filePath: z.string().describe('Relative path to the file to write'),
      content: z.string().describe('Content to write to the file'),
    },
  },
  writeHandler,
)

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport()
server
  .connect(transport)
  .then(() => {
    console.log('file-browser-mcp-server connected and listening on stdio.')
  })
  .catch((error) => {
    console.error('Failed to connect MCP server:', error)
    process.exit(1)
  })

// Graceful shutdown on process exit
process.on('SIGINT', async () => {
  console.log('SIGINT received, disconnecting server...')
  await server.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, disconnecting server...')
  await server.close()
  process.exit(0)
})
