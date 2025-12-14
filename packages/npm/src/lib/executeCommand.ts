import { spawn } from 'child_process'

export interface ExecuteResult {
  stdout: string
  stderr: string
  code: number | null
}

/**
 * Runs an npm command in a given working directory, capturing stdout, stderr, and exit code.
 */
export const executeCommand = async (command: string, args: string[], cwd: string): Promise<ExecuteResult> => {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    const npmProcess = spawn(command, args, { cwd, shell: true })
    npmProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    npmProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })
    npmProcess.on('close', (code) => {
      resolve({ stdout, stderr, code })
    })
    npmProcess.on('error', (err) => {
      stderr += `Failed to start subprocess: ${err.message}\n`
      resolve({ stdout, stderr, code: 1 })
    })
  })
}
