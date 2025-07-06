// Tool handler functions
import { getWorkingDirectory } from '../utils.js'
import { dirname, join, normalize, resolve } from 'path'
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { mkdir, readdir, readFile, stat, writeFile } from 'fs/promises'
import { rename, rm, unlink } from 'node:fs/promises'
import {
  buildDirectoryTree,
  getGitignorePatterns,
  searchRecursiveForFiles,
  searchRecursiveForPattern,
  validatePath,
} from './helpers.js'
import { promisify } from 'util'
import { exec } from 'child_process'
const execPromise = promisify(exec)

export const applyGitDiffHandler = async ({ diff }: { diff: string }): Promise<CallToolResult> => {
  const cwd = getWorkingDirectory()
  const tempDiffFile = normalize(join(cwd, 'temp.diff'))

  try {
    // Normalize line endings to Unix format (\n) to avoid Windows \r\n issues
    let normalizedDiff = diff.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // Only add a trailing newline if the diff doesn't already end with one
    // This prevents double newlines that can cause "error on line XX" issues
    if (!normalizedDiff.endsWith('\n')) {
      normalizedDiff += '\n'
    }

    // Remove any extra trailing newlines that might cause issues
    // Keep only one trailing newline
    normalizedDiff = normalizedDiff.replace(/\n+$/, '\n')

    // Additional safety: remove any trailing whitespace on lines that might cause match failures
    const lines = normalizedDiff.split('\n')
    const cleanedLines = lines.map((line, index) => {
      // Don't trim the last empty line (if it exists) as it serves as the file terminator
      return index === lines.length - 1 && line === '' ? line : line.trimEnd()
    })
    normalizedDiff = cleanedLines.join('\n')

    await writeFile(tempDiffFile, normalizedDiff, 'utf-8')

    // Apply the diff using `git apply` command with timeout and non-interactive flags
    const { stdout, stderr } = await execPromise(`git apply --reject --ignore-whitespace "${resolve(tempDiffFile)}"`, {
      cwd,
      killSignal: 'SIGKILL',
    })

    // Remove the temporary diff file
    await unlink(tempDiffFile)

    return {
      content: [
        {
          type: 'text',
          text: `Successfully applied git diff.\n\n${stdout}`,
          _meta: { stderr, exitCode: 0 },
        },
      ],
    }
  } catch (error) {
    // Cleanup temporary file on failure
    await unlink(tempDiffFile).catch(() => null)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [
        {
          type: 'text',
          text: `Error applying git diff: ${errorMessage}`,
          _meta: { stderr: errorMessage, exitCode: 1 },
        },
      ],
    }
  }
}

export const rmHandler = async ({ targetPath }: { targetPath: string }): Promise<CallToolResult> => {
  const cwd = getWorkingDirectory()

  // Validate path is within working directory
  if (!validatePath(cwd, targetPath)) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Target path is outside working directory',
          _meta: { stderr: 'Security violation: path outside working directory', exitCode: 1 },
        },
      ],
    }
  }

  const fullPath = resolve(cwd, targetPath)

  try {
    // Remove the file or directory
    await rm(fullPath, { recursive: true, force: true })
    return {
      content: [
        {
          type: 'text',
          text: `Successfully removed ${targetPath}`,
          _meta: { stderr: '', exitCode: 0 },
        },
      ],
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [
        { type: 'text', text: `Error removing target: ${errorMessage}`, _meta: { stderr: errorMessage, exitCode: 1 } },
      ],
    }
  }
}

export const moveHandler = async ({
  sourcePath,
  destinationPath,
}: {
  sourcePath: string
  destinationPath: string
}): Promise<CallToolResult> => {
  const cwd = getWorkingDirectory()
  // Validate both paths are within working directory
  if (!validatePath(cwd, sourcePath)) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Source path is outside working directory',
          _meta: { stderr: 'Security violation: path outside working directory', exitCode: 1 },
        },
      ],
    }
  }

  if (!validatePath(cwd, destinationPath)) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Destination path is outside working directory',
          _meta: { stderr: 'Security violation: path outside working directory', exitCode: 1 },
        },
      ],
    }
  }

  const fullSourcePath = resolve(cwd, sourcePath)
  const fullDestinationPath = resolve(cwd, destinationPath)

  try {
    // Ensure destination directory exists
    const destDir = dirname(fullDestinationPath)
    await mkdir(destDir, { recursive: true })

    // Perform the move operation
    await rename(fullSourcePath, fullDestinationPath)

    return {
      content: [
        {
          type: 'text',
          text: `Successfully moved ${sourcePath} to ${destinationPath}`,
          _meta: { stderr: '', exitCode: 0 },
        },
      ],
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [
        { type: 'text', text: `Error moving file: ${errorMessage}`, _meta: { stderr: errorMessage, exitCode: 1 } },
      ],
    }
  }
}

export const mkdirHandler = async ({ dirPath }: { dirPath: string }): Promise<CallToolResult> => {
  const cwd = getWorkingDirectory()

  // Validate path is within working directory
  if (!validatePath(cwd, dirPath)) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Directory path is outside working directory',
          _meta: { stderr: 'Security violation: path outside working directory', exitCode: 1 },
        },
      ],
    }
  }

  const fullDirPath = resolve(cwd, dirPath)

  try {
    await mkdir(fullDirPath, { recursive: true })

    return {
      content: [
        {
          type: 'text',
          text: `Successfully created directory ${dirPath}`,
          _meta: { stderr: '', exitCode: 0 },
        },
      ],
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [
        {
          type: 'text',
          text: `Error creating directory: ${errorMessage}`,
          _meta: { stderr: errorMessage, exitCode: 1 },
        },
      ],
    }
  }
}

export const searchHandler = async ({ pattern }: { pattern: string }): Promise<CallToolResult> => {
  const cwd = getWorkingDirectory()
  const results: string[] = []
  const gitignorePatterns = await getGitignorePatterns(cwd)

  if (!validatePath(cwd, cwd)) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Current directory is outside working directory',
          _meta: { stderr: 'Security violation', exitCode: 1 },
        },
      ],
    }
  }

  await searchRecursiveForFiles(cwd, cwd, pattern, gitignorePatterns, results)

  return {
    content: [
      {
        type: 'text',
        text: results.length > 0 ? `Found files:\n${results.join('\n')}` : 'No files found matching pattern',
        _meta: { stderr: '', exitCode: 0 },
      },
    ],
  }
}

export const lsHandler = async ({ path: subPath }: { path?: string | undefined }): Promise<CallToolResult> => {
  const cwd = getWorkingDirectory()
  const targetDir = subPath ? join(cwd, subPath) : cwd

  try {
    const entries = await readdir(targetDir)
    const results: string[] = []

    for (const entry of entries) {
      const fullPath = join(targetDir, entry)
      const stats = await stat(fullPath)
      const type = stats.isDirectory() ? 'DIR' : 'FILE'
      const size = stats.isFile() ? ` (${stats.size} bytes)` : ''
      results.push(`${type.padEnd(4)} ${entry}${size}`)
    }

    return {
      content: [
        {
          type: 'text',
          text: `Contents of ${subPath || '.'}:\n${results.join('\n')}`,
          _meta: { stderr: '', exitCode: 0 },
        },
      ],
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [
        {
          type: 'text',
          text: `Error listing directory: ${errorMessage}`,
          _meta: { stderr: errorMessage, exitCode: 1 },
        },
      ],
    }
  }
}

export const treeHandler = async ({ depth = 5 }: { depth?: number }): Promise<CallToolResult> => {
  const cwd = getWorkingDirectory()
  const results: string[] = []
  const gitignorePatterns = await getGitignorePatterns(cwd)
  const fileCount = { count: 0 }

  if (!validatePath(cwd, cwd)) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Current directory is outside working directory',
          _meta: { stderr: 'Security violation', exitCode: 1 },
        },
      ],
    }
  }

  await buildDirectoryTree(cwd, cwd, 1, depth, gitignorePatterns, results, fileCount)

  return {
    content: [
      {
        type: 'text',
        text: `Directory tree (max depth: ${depth}, showing ${fileCount.count} items):\n${results.join('\n')}`,
        _meta: { stderr: '', exitCode: 0 },
      },
    ],
  }
}

export const grepHandler = async ({
  pattern,
  filePattern = '*',
}: {
  pattern: string
  filePattern?: string
}): Promise<CallToolResult> => {
  const cwd = getWorkingDirectory()
  const results: string[] = []
  const gitignorePatterns = await getGitignorePatterns(cwd)
  const matchCount = { count: 0 }

  if (!validatePath(cwd, cwd)) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Current directory is outside working directory',
          _meta: { stderr: 'Security violation', exitCode: 1 },
        },
      ],
    }
  }

  await searchRecursiveForPattern(cwd, cwd, pattern, filePattern, gitignorePatterns, results, matchCount)

  return {
    content: [
      {
        type: 'text',
        text: results.length > 0 ? `Found ${matchCount.count} matches:\n${results.join('\n')}` : 'No matches found',
        _meta: { stderr: '', exitCode: 0 },
      },
    ],
  }
}

export const grepReplaceHandler = async ({
  pattern,
  replacement,
  filePath,
}: {
  pattern: string
  replacement: string
  filePath: string
}): Promise<CallToolResult> => {
  const cwd = getWorkingDirectory()

  // Validate path is within working directory
  if (!validatePath(cwd, filePath)) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: File path is outside working directory',
          _meta: { stderr: 'Security violation: path outside working directory', exitCode: 1 },
        },
      ],
    }
  }

  const fullPath = resolve(cwd, filePath)

  try {
    const content = await readFile(fullPath, 'utf-8')
    const regex = new RegExp(pattern, 'g')
    const newContent = content.replace(regex, replacement)

    const matches = content.match(regex)?.length || 0

    if (matches > 0) {
      await writeFile(fullPath, newContent, 'utf-8')
      return {
        content: [
          {
            type: 'text',
            text: `Replaced ${matches} occurrences in ${filePath}`,
            _meta: { stderr: '', exitCode: 0 },
          },
        ],
      }
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `No matches found in ${filePath}`,
            _meta: { stderr: '', exitCode: 0 },
          },
        ],
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [
        { type: 'text', text: `Error processing file: ${errorMessage}`, _meta: { stderr: errorMessage, exitCode: 1 } },
      ],
    }
  }
}

export const openHandler = async ({ filePath }: { filePath: string }): Promise<CallToolResult> => {
  const cwd = getWorkingDirectory()
  const fullPath = resolve(cwd, filePath)

  try {
    const content = await readFile(fullPath, 'utf-8')
    return {
      content: [
        {
          type: 'text',
          text: `Content of ${filePath}:\n\n${content}`,
          _meta: { stderr: '', exitCode: 0 },
        },
      ],
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [
        { type: 'text', text: `Error reading file: ${errorMessage}`, _meta: { stderr: errorMessage, exitCode: 1 } },
      ],
    }
  }
}

export const openMultipleHandler = async ({ filePaths }: { filePaths: string[] }): Promise<CallToolResult> => {
  const cwd = getWorkingDirectory()
  const results: string[] = []

  for (const filePath of filePaths.slice(0, 5)) {
    const fullPath = resolve(cwd, filePath)

    if (!validatePath(cwd, filePath)) {
      results.push(`\n=== ${filePath} ===\nError: Path is outside working directory`)
      continue
    }

    try {
      const content = await readFile(fullPath, 'utf-8')
      results.push(`\n=== ${filePath} ===\n${content}`)
    } catch (error) {
      results.push(`\n=== ${filePath} ===\nError: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Contents of ${filePaths.length} files:${results.join('\n')}`,
        _meta: { stderr: '', exitCode: 0 },
      },
    ],
  }
}

export const writeHandler = async ({
  filePath,
  content,
}: {
  filePath: string
  content: string
}): Promise<CallToolResult> => {
  const cwd = getWorkingDirectory()

  // Validate path is within working directory
  if (!validatePath(cwd, filePath)) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: File path is outside working directory',
          _meta: { stderr: 'Security violation: path outside working directory', exitCode: 1 },
        },
      ],
    }
  }

  const fullPath = resolve(cwd, filePath)

  try {
    // Ensure directory exists
    const dir = dirname(fullPath)
    await mkdir(dir, { recursive: true })

    await writeFile(fullPath, content, 'utf-8')
    return {
      content: [
        {
          type: 'text',
          text: `Successfully wrote ${content.length} characters to ${filePath}`,
          _meta: { stderr: '', exitCode: 0 },
        },
      ],
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      content: [
        { type: 'text', text: `Error writing file: ${errorMessage}`, _meta: { stderr: errorMessage, exitCode: 1 } },
      ],
    }
  }
}
