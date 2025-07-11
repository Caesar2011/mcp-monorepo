import { spawn } from 'child_process'

import { getWorkingDirectory } from './getWorkingDirectory.js'

export interface ExecuteResult {
  stdout: string
  stderr: string
  code: number | null
  command: string
}

export function spawnPromise(command: string, cwd: string): Promise<ExecuteResult> {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    console.log(command)
    // Use shell:true for compatibility with env/complex commands
    const proc = spawn(command, { cwd, shell: true })
    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    proc.on('close', (code) => {
      resolve({ stdout, stderr, code, command: command })
    })
    proc.on('error', (err) => {
      stderr += `Failed to start subprocess: ${err.message}\n`
      resolve({ stdout, stderr, code: 1, command: command })
    })
  })
}

/**
 * Runs a shell command in a given working directory, capturing stdout, stderr, and exit code.
 */
export const executePostWriteCommand = async (file: string | string[]): Promise<ExecuteResult | undefined> => {
  const cwd = getWorkingDirectory()
  const command = process.env.POST_WRITE_LINT
  if (!command || command.trim() === '') return new Promise((resolve) => resolve(undefined))
  const files = Array.isArray(file) ? file : [file]
  const fileList = files.map((f) => `"${f}"`).join(' ')
  const actualCommand = command.replace(/%file%/g, fileList)
  const result: ExecuteResult = { stdout: '', stderr: '', code: 0, command: actualCommand }
  for (const cmd of actualCommand
    .split('&&')
    .map((c) => c.trim())
    .filter((c) => c !== '')) {
    const newResult = await spawnPromise(cmd, cwd)
    result.stdout += '\n' + newResult.stdout
    result.stderr += '\n' + newResult.stderr
    result.code = newResult.code
    if (result.code !== 0) {
      break
    }
  }
  result.stdout = result.stdout.replace(/^\n*|\n*$/g, '')
  result.stderr = result.stderr.replace(/^\n*|\n*$/g, '')
  return result
}
