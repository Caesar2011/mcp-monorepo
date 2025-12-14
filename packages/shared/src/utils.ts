import fs from 'fs/promises'
import path from 'path'

import type { PackageJson } from 'types-package-json'

export async function findProjectRoot(currentDir: string) {
  let dir = currentDir
  while (true) {
    const packageJsonPath = path.join(dir, 'package.json')
    try {
      await fs.access(packageJsonPath)
      return dir
    } catch (_) {
      const parentDir = path.dirname(dir)
      if (parentDir === dir) {
        throw new Error('package.json not found in any parent directory.')
      }
      dir = parentDir
    }
  }
}

export async function getPackageJson(importMetaPath: string) {
  const dirname = path.dirname(importMetaPath)
  try {
    const projectRoot = await findProjectRoot(dirname)
    const packageJsonPath = path.join(projectRoot, 'package.json')
    const data = await fs.readFile(packageJsonPath, 'utf8')
    return JSON.parse(data) as Partial<PackageJson>
  } catch (error) {
    throw new Error('Error retrieving package.json: ' + error)
  }
}

export function performKeywordSearch<T>(
  query: string,
  entities: T[],
  getSearchProperties: (entity: T) => (string | undefined)[],
  secondaryCompare: (a: T, b: T) => number,
): { match: T; matchCount: number; matchedWords: string[] }[] {
  if (!query.trim()) {
    throw new Error('Search query cannot be empty')
  }

  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0)
  const resultsWithScores = entities
    .map((entity) => {
      const searchText = getSearchProperties(entity)
        .map((x) => x ?? '')
        .join(' ')
        .toLowerCase()

      const matchedWords = keywords.filter((keyword) => searchText.includes(keyword))

      return {
        match: entity,
        matchCount: matchedWords.length,
        matchedWords,
      }
    })
    .filter((result) => result.matchCount > 0)

  resultsWithScores.sort((a, b) => {
    if (a.matchCount !== b.matchCount) {
      return b.matchCount - a.matchCount
    }
    return secondaryCompare(a.match, b.match)
  })

  return resultsWithScores
}
