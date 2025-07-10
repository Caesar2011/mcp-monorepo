import { readFile } from 'fs/promises'
import path, { normalize } from 'path'

import { getWorkingDirectory } from '../lib/getWorkingDirectory.js'

export async function getScriptsOrError(
  workspace?: string,
): Promise<{ scripts: Record<string, string> } | { error: string }> {
  const cwd = getWorkingDirectory()
  // If workspace is provided, treat as relative path to package.json
  const packageJsonPath = workspace
    ? path.isAbsolute(workspace)
      ? workspace
      : path.join(cwd, workspace)
    : path.join(cwd, 'package.json')
  try {
    const content = await readFile(normalize(packageJsonPath), 'utf-8')
    const data = JSON.parse(content)
    const scripts = typeof data.scripts === 'object' && data.scripts ? data.scripts : {}
    return { scripts }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error'
    return { error }
  }
}
