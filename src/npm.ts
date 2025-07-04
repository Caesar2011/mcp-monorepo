import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod' // Import zod for schema validation
import { spawn } from 'child_process'
import { readFile } from 'fs/promises'
import path from 'path'
import { getWorkingDirectory } from './utils.js'

// Create an MCP server instance
const server = new McpServer({
  name: 'npm-mcp-server',
  version: '1.0.0', // Semantic versioning is good practice
  description: 'A server to interact with npm commands (run scripts, install packages).',
})

// Helper function to execute npm commands and capture output
const executeNpmCommand = async (
  command: string,
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; code: number | null }> => {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''

    // Spawn the npm process. `shell: true` is important for npm to be found in PATH.
    const npmProcess = spawn(command, args, { cwd, shell: true })

    npmProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    npmProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    npmProcess.on('close', (code) => {
      console.log(`npm command exited with code ${code}`)
      resolve({ stdout, stderr, code })
    })

    npmProcess.on('error', (err) => {
      stderr += `Failed to start subprocess: ${err.message}\n`
      console.error(`Failed to start npm process: ${err.message}`)
      resolve({ stdout, stderr, code: 1 }) // Indicate an error if the process couldn't even start
    })
  })
}

// Register the "list-scripts" tool
server.registerTool(
  'list-scripts',
  {
    title: 'List npm scripts',
    description: "Lists all available npm scripts defined in the project's package.json file.",
    inputSchema: {}, // No input parameters needed
  },
  async () => {
    const cwd = getWorkingDirectory()
    const packageJsonPath = path.join(cwd, 'package.json')

    try {
      console.log(`MCP Tool: Reading package.json from directory: ${cwd}`)
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageJsonContent)

      const scripts = packageJson.scripts || {}

      if (Object.keys(scripts).length === 0) {
        return {
          content: [{ type: 'text', text: 'No npm scripts found in package.json' }],
          toolOutput: {
            stderr: '',
            exitCode: 0,
          },
        }
      }

      // Format the scripts as a readable list
      let output = 'Available npm scripts:\n\n'
      for (const [scriptName, command] of Object.entries(scripts)) {
        output += `• ${scriptName}: ${command}\n`
      }

      return {
        content: [{ type: 'text', text: output }],
        toolOutput: {
          stderr: '',
          exitCode: 0,
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Failed to read or parse package.json: ${errorMessage}`)

      return {
        content: [{ type: 'text', text: `Error reading package.json: ${errorMessage}` }],
        toolOutput: {
          stderr: errorMessage,
          exitCode: 1,
        },
      }
    }
  },
)

// Register the "run" tool
server.registerTool(
  'run', // The name of the tool
  {
    title: 'Run npm script', // A human-readable title for UI
    description: "Executes a specific script defined in the project's package.json file.", // Detailed description
    inputSchema: {
      // Define the input schema using Zod
      scriptName: z.string().describe('The name of the npm script to execute (e.g., "start", "test", "build").'),
    },
  },
  // The asynchronous handler function for the tool
  async ({ scriptName }) => {
    const cwd = getWorkingDirectory()
    console.log(`MCP Tool: Running npm script "${scriptName}" in directory: ${cwd}`)
    const { stdout, stderr, code } = await executeNpmCommand('npm', ['run', scriptName], cwd)

    // Return the results in a format expected by MCP tools
    return {
      content: [{ type: 'text', text: stdout, _meta: { stderr, code } }],
    }
  },
)

// Register the "install" tool
server.registerTool(
  'install', // The name of the tool
  {
    title: 'Install npm package', // A human-readable title
    description: 'Installs a specified npm package into the current project.', // Detailed description
    inputSchema: {
      // Define the input schema using Zod
      packageName: z.string().describe('The name of the npm package to install (e.g., "express", "lodash").'),
      dev: z
        .boolean()
        .default(false)
        .describe(
          'Set to true to install as a development dependency (--save-dev); defaults to false for normal dependency.',
        ),
    },
  },
  // The asynchronous handler function for the tool
  async ({ packageName, dev }) => {
    const cwd = getWorkingDirectory()
    const args = ['install', packageName]
    if (dev) {
      args.push('--save-dev')
    }
    console.log(`MCP Tool: Installing package "${packageName}" ${dev ? '(dev)' : ''} in directory: ${cwd}`)
    const { stdout, stderr, code } = await executeNpmCommand('npm', args, cwd)

    return {
      content: [{ type: 'text', text: stdout, _meta: { stderr, code } }],
    }
  },
)

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport()
server
  .connect(transport)
  .then(() => {
    console.log('npm-mcp-server connected and listening on stdio.')
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
