import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'

type Ruleset = {
  exact: RegExp
  partial: RegExp
  isAllowRule: boolean
}[]

/**
 * Service to handle ignored files and directories.
 */
export class IgnoreFileService {
  private ignoreFiles: Record<string, Ruleset> = {}

  /**
   * Adds a file or directory path to the ignore list.
   * @param filePath The absolute path to the ignore list
   */
  async add(filePath: string): Promise<void> {
    const directoryPath = dirname(filePath)
    const fileContent = await readFile(filePath, 'utf-8')
    this.addByContent(directoryPath, fileContent)
  }

  /**
   * Adds a file or directory path to the ignored list.
   * @param directoryPath The directory to the ignore list it has its effect on
   * @param fileContent The file content of the ignore list
   */
  addByContent(directoryPath: string, fileContent: string): void {
    this.ignoreFiles[directoryPath] = [
      ...(this.ignoreFiles[directoryPath] ?? []),
      ...this.deriveRegexps(directoryPath, fileContent),
    ]
  }

  /**
   * Checks if a directory could contain allowed files.
   * @param dirPath The absolute path to the directory.
   * @returns {boolean} True if the directory could contain allowed files, false otherwise.
   */
  couldDirectoryContainAllowedFiles(dirPath: string): boolean {
    const unixlikePath = dirPath.replace(/\\/g, '/')
    return Object.entries(this.ignoreFiles)
      .filter(([path]) => dirPath.startsWith(path))
      .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
      .flatMap(([, rules]) => rules)
      .reduce((isAllowed, ruleset) => {
        if (ruleset.exact.test(unixlikePath)) {
          return ruleset.isAllowRule
        } else if (ruleset.isAllowRule && ruleset.partial.test(unixlikePath)) {
          return true
        } else return isAllowed
      }, true)
  }

  /**
   * Checks if a file is ignored.
   * @param filePath The absolute path to the file.
   * @returns {boolean} True if the file is ignored, false otherwise.
   */
  isPathIgnored(filePath: string): boolean {
    const directoryPath = dirname(filePath)
    const unixlikePath = filePath.replace(/\\/g, '/')
    return Object.entries(this.ignoreFiles)
      .filter(([path]) => directoryPath.startsWith(path))
      .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
      .flatMap(([, rules]) => rules)
      .reduce((isAllowed, ruleset) => {
        if (ruleset.exact.test(unixlikePath)) {
          return !ruleset.isAllowRule
        } else return isAllowed
      }, false)
  }

  private deriveRegexps(absDirPath: string, fileContent: string): Ruleset {
    return fileContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => {
        const isAllowRule = line.startsWith('!')
        const normalLine = (isAllowRule ? line.slice(1) : line).replace(/^\\/, '')
        return {
          isAllowRule,
          exact: IgnoreFileService.getExactRegex(absDirPath, normalLine),
          partial: IgnoreFileService.getPartialRegex(absDirPath, normalLine),
        }
      })
  }

  public static getExactRegex(absDirPath: string, normalLine: string): RegExp {
    normalLine = normalLine.replace(/^(\*\*\/)+/g, '')

    // Escape special regex characters
    const escapedLine = normalLine
      .replace(/[.+^${}()|\\]/g, '\\$&') // Escape regex special characters
      .replace(/\*\*/g, '.*') // Replace ** with .*
      .replace(/\\\.\*/g, '\\.[^/]*') // Replace * with [^/]* (anything except /)
      .replace(/(?<!\.)\*/g, '[^/]*')
      .replace(/\?/g, '[^/]') // Replace ? with [^/] (any single character except /)

    // Handle leading `/` (relative to absDirPath)
    const isAbsolute = normalLine.startsWith('/')
    absDirPath = absDirPath.replace(/\\/g, '/')
    absDirPath = absDirPath.endsWith('/') ? absDirPath.substring(0, absDirPath.length - 1) : absDirPath
    const basePath = isAbsolute ? absDirPath : '.*/'

    // Handle trailing `/` (directory-only match)
    const regexPattern = `^${basePath}${escapedLine}`

    // Return the compiled regex
    return new RegExp(regexPattern, 'i') // 'i' for case-insensitivity (Windows support)
  }

  public static getPartialRegex(absDirPath: string, normalLine: string): RegExp {
    // Normalize the pattern
    if (!normalLine.startsWith('/') && !normalLine.startsWith('**')) {
      normalLine = `**/${normalLine}`
    }

    // Strip everything after the first `**`
    const strippedLine = normalLine.split('**')[0]

    // Escape special regex characters
    const escapedLine = strippedLine
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special characters
      .replace(/\\\.\*/g, '\\.[^/]*') // Replace * with [^/]* (anything except /)
      .replace(/(?<!\.)\*/g, '[^/]*')
      .replace(/\?/g, '[^/]') // Replace ? with [^/] (any single character except /)

    // Handle leading `/` (relative to absDirPath)
    const isAbsolute = normalLine.startsWith('/')
    absDirPath = absDirPath.replace(/\\/g, '/')
    absDirPath = absDirPath.endsWith('/') ? absDirPath.substring(0, absDirPath.length - 1) : absDirPath
    const basePath = isAbsolute ? absDirPath : '.*/'

    // Construct the regex pattern
    const regexPattern = `^${basePath}${escapedLine}`

    // Return the compiled regex
    return new RegExp(regexPattern, 'i') // 'i' for case-insensitivity (Windows support)
  }
}
