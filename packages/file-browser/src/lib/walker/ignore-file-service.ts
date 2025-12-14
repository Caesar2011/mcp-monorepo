import { readFile } from 'node:fs/promises'
import { platform } from 'node:os'
import { dirname, relative } from 'node:path'

const isWindows = platform() === 'win32'
const toPosixPath = (p: string) => p.replace(/\\/g, '/')

// This function converts a simple glob pattern to a regex.
function globToRegex(pattern: string): RegExp {
  const flags = isWindows ? 'i' : ''
  const regexString = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special characters
    .replace(/\*/g, '.*') // `*` becomes `.*` for this simplified purpose
  return new RegExp(`^${regexString}$`, flags)
}

type Rule = {
  originalPattern: string
  regex: RegExp
  isAllowRule: boolean
}

export class IgnoreFileService {
  private rulesByDirectory: Record<string, Rule[]> = {}

  async add(filePath: string): Promise<void> {
    const directoryPath = dirname(filePath)
    const fileContent = await readFile(filePath, 'utf-8')
    this.addByContent(directoryPath, fileContent)
  }

  addByContent(directoryPath: string, fileContent: string): void {
    const posixDir = toPosixPath(directoryPath)
    if (!this.rulesByDirectory[posixDir]) {
      this.rulesByDirectory[posixDir] = []
    }

    const newRules = fileContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const isAllowRule = line.startsWith('!')
        const pattern = isAllowRule ? line.slice(1) : line

        return {
          originalPattern: pattern,
          regex: globToRegex(pattern),
          isAllowRule,
        }
      })

    this.rulesByDirectory[posixDir] = this.rulesByDirectory[posixDir].concat(newRules)
  }

  isPathIgnored(absolutePath: string): boolean {
    const posixPath = toPosixPath(absolutePath)
    let isIgnored = false

    const applicableDirs = Object.keys(this.rulesByDirectory)
      .filter((dir) => posixPath.startsWith(dir))
      .sort((a, b) => a.length - b.length)

    for (const dir of applicableDirs) {
      const relativePath = toPosixPath(relative(dir, posixPath))
      const rules = this.rulesByDirectory[dir]

      for (const rule of rules) {
        let match = false

        // Patterns with a slash are matched relative to the .gitignore file.
        if (rule.originalPattern.includes('/')) {
          const patternToCheck = rule.originalPattern.endsWith('/')
            ? rule.originalPattern.slice(0, -1)
            : rule.originalPattern

          // Check if the relative path starts with or matches the pattern
          if (relativePath === patternToCheck || relativePath.startsWith(patternToCheck + '/')) {
            match = true
          } else {
            // For patterns with wildcards, use regex matching
            const patternRegex = globToRegex(patternToCheck)
            const pathSegments = relativePath.split('/')
            // Check against full path and each potential subpath
            for (let i = 0; i < pathSegments.length; i++) {
              const testPath = pathSegments.slice(0, i + 1).join('/')
              if (patternRegex.test(testPath)) {
                match = true
                break
              }
            }
          }
        }
        // Patterns without a slash are matched against any path segment.
        else {
          const pathSegments = relativePath.split('/')
          if (pathSegments.some((segment) => rule.regex.test(segment))) {
            match = true
          }
        }

        if (match) {
          isIgnored = !rule.isAllowRule
        }
      }
    }
    return isIgnored
  }

  couldDirectoryContainAllowedFiles(absolutePath: string): boolean {
    // If the directory itself is not ignored, we must enter it.
    if (!this.isPathIgnored(absolutePath)) {
      return true
    }

    // If it IS ignored, we only need to enter if an "allow" rule could apply to a child.
    const posixPath = toPosixPath(absolutePath)
    const applicableDirs = Object.keys(this.rulesByDirectory)
      .filter((dir) => posixPath.startsWith(dir))
      .sort((a, b) => a.length - b.length) // Process from root to nested

    for (const dir of applicableDirs) {
      const relativePath = toPosixPath(relative(dir, posixPath))
      const rules = this.rulesByDirectory[dir]

      for (const rule of rules) {
        if (!rule.isAllowRule) continue

        // Check if this allow rule could apply to files within this directory
        const pattern = rule.originalPattern

        // Remove leading slash if present for comparison
        const normalizedPattern = pattern.startsWith('/') ? pattern.slice(1) : pattern
        const normalizedRelPath = relativePath

        // Check if the pattern could match something inside this directory
        if (pattern.includes('/')) {
          // Pattern with slash: check if it starts with or is within our path
          if (
            normalizedPattern.startsWith(normalizedRelPath + '/') ||
            normalizedPattern.startsWith(normalizedRelPath) ||
            normalizedRelPath.startsWith(normalizedPattern.split('/')[0])
          ) {
            return true
          }
        } else {
          // Pattern without slash: could match any file in any subdirectory
          return true
        }
      }
    }

    return false
  }
}
