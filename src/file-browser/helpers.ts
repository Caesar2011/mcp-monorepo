import micromatch from 'micromatch'
import { readFile, readdir, stat } from 'fs/promises'
import { join, relative, resolve, normalize } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

// Security helper to ensure path is within working directory
export const validatePath = (cwd: string, filePath: string): boolean => {
  const fullWorkingDir = resolve(cwd)
  const fullPath = resolve(fullWorkingDir, filePath)
  const normalizedPath = normalize(fullPath)
  const normalizedCwd = normalize(fullWorkingDir)
  return normalizedPath.startsWith(normalizedCwd)
}

// Helper function to check if path should be ignored based on .gitignore
export function shouldIgnorePath(path: string, patterns: string[]): boolean {
  if (!patterns || patterns.length === 0) {
    return false
  }

  // Normalize path separators to forward slashes
  const normalizedPath = path.replace(/\\/g, '/')

  for (const pattern of patterns) {
    // Skip empty patterns, whitespace-only patterns, and comments
    if (!pattern || pattern.trim() === '' || pattern.trim().startsWith('#')) {
      continue
    }

    const trimmedPattern = pattern.trim()

    // Handle root-only patterns (starting with /)
    if (trimmedPattern.startsWith('/')) {
      const rootPattern = trimmedPattern.slice(1)
      if (rootPattern.endsWith('/')) {
        // Directory pattern from root
        const dirPattern = rootPattern.slice(0, -1)
        if (normalizedPath.startsWith(dirPattern + '/') || normalizedPath === dirPattern) {
          return true
        }
      } else {
        // File/directory pattern from root
        const regexPattern = rootPattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.')

        if (
          normalizedPath.startsWith(rootPattern + '/') ||
          normalizedPath === rootPattern ||
          new RegExp(`^${regexPattern}(/|$)`).test(normalizedPath)
        ) {
          return true
        }
      }
      continue
    }

    // Handle directory patterns (ending with /)
    if (trimmedPattern.endsWith('/')) {
      const dirPattern = trimmedPattern.slice(0, -1)
      if (
        normalizedPath.startsWith(dirPattern + '/') ||
        normalizedPath.includes('/' + dirPattern + '/') ||
        normalizedPath === dirPattern
      ) {
        return true
      }
      continue
    }

    // Convert glob pattern to regex and check all matching scenarios
    const regexPattern = trimmedPattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')

    const regex = new RegExp(regexPattern)

    // Check: full path match, any path segment match, or substring match
    if (
      regex.test(normalizedPath) ||
      normalizedPath.split('/').some((segment) => regex.test(segment) || segment.includes(trimmedPattern))
    ) {
      return true
    }
  }

  return false
}

// Helper function to read .gitignore patterns
export const getGitignorePatterns = async (cwd: string): Promise<string[]> => {
  const DEFAULT_VALUE = ['node_modules', '.git', 'dist', 'build', '.next', '.nuxt']
  try {
    const gitignorePath = join(cwd, '.gitignore')
    const content = await readFile(gitignorePath, 'utf-8')
    if (content === '\ufffd\ufffd\u0000\u0000') return DEFAULT_VALUE
    return content.split('\n').filter((line) => line.trim() && !line.startsWith('#'))
  } catch {
    return DEFAULT_VALUE
  }
}

// Helper function to check if git is in $PATH
export const isGitAvailable = async (): Promise<boolean> => {
  try {
    console.log(await execPromise('git --version'))
    return true
  } catch {
    return false
  }
}

// Extracted recursive search function for file search
export const searchRecursiveForFiles = async (
  dir: string,
  cwd: string,
  pattern: string,
  gitignorePatterns: string[],
  results: string[],
): Promise<void> => {
  if (!validatePath(cwd, dir)) return

  try {
    const entries = await readdir(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const relativePath = relative(cwd, fullPath)

      if (shouldIgnorePath(relativePath, gitignorePatterns)) continue

      const stats = await stat(fullPath)
      if (stats.isDirectory()) {
        await searchRecursiveForFiles(fullPath, cwd, pattern, gitignorePatterns, results)
      } else if (entry.includes(pattern) || entry.match(new RegExp(pattern.replace(/\*/g, '.*')))) {
        results.push(relativePath)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }
}

// Extracted tree building function
export const buildDirectoryTree = async (
  dir: string,
  cwd: string,
  currentDepth: number,
  maxDepth: number,
  gitignorePatterns: string[],
  results: string[],
  fileCount: { count: number },
  prefix: string = '',
): Promise<void> => {
  if (!validatePath(cwd, dir) || currentDepth > maxDepth || fileCount.count >= 200) return

  try {
    const entries = await readdir(dir)
    for (let i = 0; i < entries.length && fileCount.count < 200; i++) {
      const entry = entries[i] as string
      const fullPath = join(dir, entry)
      const relativePath = relative(cwd, fullPath)

      if (shouldIgnorePath(relativePath, gitignorePatterns)) continue

      const isLast = i === entries.length - 1
      const currentPrefix = prefix + (isLast ? '└── ' : '├── ')
      const nextPrefix = prefix + (isLast ? '    ' : '│   ')

      const stats = await stat(fullPath)
      if (stats.isDirectory()) {
        results.push(`${currentPrefix}${entry}/`)
        fileCount.count++
        await buildDirectoryTree(
          fullPath,
          cwd,
          currentDepth + 1,
          maxDepth,
          gitignorePatterns,
          results,
          fileCount,
          nextPrefix,
        )
      } else {
        results.push(`${currentPrefix}${entry}`)
        fileCount.count++
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }
}

// Extracted function to search in a single file
export const searchInFileForPattern = async (
  filePath: string,
  cwd: string,
  pattern: string,
  results: string[],
  matchCount: { count: number },
): Promise<void> => {
  if (!validatePath(cwd, filePath)) return
  if (matchCount.count >= 50) return

  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length && matchCount.count < 50; i++) {
      if ((lines[i] as string).includes(pattern)) {
        matchCount.count++
        const relativePath = relative(cwd, filePath)
        results.push(`\n${relativePath}:${i + 1}`)

        // Add context lines (3 before and after)
        const start = Math.max(0, i - 3)
        const end = Math.min(lines.length, i + 4)

        for (let j = start; j < end; j++) {
          const marker = j === i ? '>' : ' '
          results.push(`${marker} ${j + 1}: ${lines[j]}`)
        }
      }
    }
  } catch {
    // Skip files that can't be read as text
  }
}

// Extracted recursive search function for grep
export const searchRecursiveForPattern = async (
  dir: string,
  cwd: string,
  pattern: string,
  filePattern: string,
  gitignorePatterns: string[],
  results: string[],
  matchCount: { count: number },
): Promise<void> => {
  if (!validatePath(cwd, dir) || matchCount.count >= 50) return

  try {
    const entries = await readdir(dir)
    for (const entry of entries) {
      if (matchCount.count >= 50) break

      const fullPath = join(dir, entry)
      const relativePath = relative(cwd, fullPath)

      if (shouldIgnorePath(relativePath, gitignorePatterns)) continue

      const stats = await stat(fullPath)
      if (stats.isDirectory()) {
        await searchRecursiveForPattern(fullPath, cwd, pattern, filePattern, gitignorePatterns, results, matchCount)
      } else if (micromatch.isMatch(entry, filePattern)) {
        await searchInFileForPattern(fullPath, cwd, pattern, results, matchCount)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }
}
