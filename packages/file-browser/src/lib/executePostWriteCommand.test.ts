import { spawn } from 'child_process'

import { describe, it, expect, vi, afterEach } from 'vitest'

import { spawnPromise, executePostWriteCommand, type ExecuteResult } from './executePostWriteCommand'
import { getWorkingDirectory } from './getWorkingDirectory.js'

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}))

vi.mock('./getWorkingDirectory.js', () => ({
  getWorkingDirectory: vi.fn(),
}))

describe('spawnPromise', () => {
  it('should resolve with correct ExecuteResult for a successful command', async () => {
    const mockCommand = 'echo hello'
    const mockCwd = '/mock/directory'
    const mockStdout = 'hello\n'
    const mockStderr = ''
    const mockCode = 0

    const mockSpawn = {
      stdout: { on: vi.fn((event, cb) => event === 'data' && cb(Buffer.from(mockStdout))) },
      stderr: { on: vi.fn((event, cb) => event === 'data' && cb(Buffer.from(mockStderr))) },
      on: vi.fn((event, cb) => event === 'close' && cb(mockCode)),
    }
    vi.mocked(spawn).mockReturnValue(mockSpawn as unknown as ReturnType<typeof spawn>)

    const result = await spawnPromise(mockCommand, mockCwd)
    expect(result).toEqual({
      stdout: mockStdout,
      stderr: mockStderr,
      code: mockCode,
      command: mockCommand,
    })
    expect(spawn).toHaveBeenCalledWith(mockCommand, { cwd: mockCwd, shell: true })
  })

  it('should handle errors when subprocess fails to start', async () => {
    const mockCommand = 'invalid-command'
    const mockCwd = '/mock/directory'
    const mockError = new Error('Subprocess failed to start')

    const mockSpawn = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, cb) => {
        if (event === 'close') cb(100)
      }),
    }
    vi.mocked(spawn).mockReturnValue(mockSpawn as unknown as ReturnType<typeof spawn>)

    const result = await spawnPromise(mockCommand, mockCwd)
    expect(result).toEqual({
      stdout: '',
      stderr: ``,
      code: 100,
      command: mockCommand,
    })
  })

  it('should handle errors when subprocess fails to start', async () => {
    const mockCommand = 'invalid-command'
    const mockCwd = '/mock/directory'
    const mockError = new Error('Subprocess failed to start')

    const mockSpawn = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((event, cb) => {
        if (event === 'error') cb(mockError)
      }),
    }
    vi.mocked(spawn).mockReturnValue(mockSpawn as unknown as ReturnType<typeof spawn>)

    const result = await spawnPromise(mockCommand, mockCwd)
    expect(result).toEqual({
      stdout: '',
      stderr: `Failed to start subprocess: ${mockError.message}\n`,
      code: 1,
      command: mockCommand,
    })
  })
})

describe('executePostWriteCommand', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })
  it('should resolve undefined if POST_WRITE_LINT environment variable is not set', async () => {
    process.env.POST_WRITE_LINT = ''
    const result = await executePostWriteCommand('test.txt')
    expect(result).toBeUndefined()
  })

  it('should execute a command with multiple files and resolve correctly', async () => {
    const mockCwd = '/mock/directory'
    const mockStdout1 = 'File 1 processed'
    const mockStdout2 = 'File 2 processed'
    const mockCommand = 'echo %file% && meeh %file%'
    const mockFiles = ['file1.txt', 'file2.txt']
    const expectedCommand1 = 'echo "file1.txt" "file2.txt"'
    const expectedCommand2 = 'meeh "file1.txt" "file2.txt"'
    const expectedCommand = 'echo "file1.txt" "file2.txt" && meeh "file1.txt" "file2.txt"'
    process.env.POST_WRITE_LINT = mockCommand
    vi.mocked(getWorkingDirectory).mockReturnValue(mockCwd)

    const mockSpawn1 = {
      stdout: { on: vi.fn((event, cb) => event === 'data' && cb(Buffer.from(mockStdout1))) },
      stderr: { on: vi.fn() },
      on: vi.fn((event, cb) => event === 'close' && cb(0)),
    }
    vi.mocked(spawn).mockReturnValueOnce(mockSpawn1 as unknown as ReturnType<typeof spawn>)

    const mockSpawn2 = {
      stdout: { on: vi.fn((event, cb) => event === 'data' && cb(Buffer.from(mockStdout2))) },
      stderr: { on: vi.fn() },
      on: vi.fn((event, cb) => event === 'close' && cb(0)),
    }
    vi.mocked(spawn).mockReturnValueOnce(mockSpawn2 as unknown as ReturnType<typeof spawn>)

    const result = (await executePostWriteCommand(mockFiles)) as ExecuteResult
    expect(result).toEqual({
      stdout: 'File 1 processed\nFile 2 processed',
      stderr: '',
      code: 0,
      command: expectedCommand,
    })
    expect(spawn).toHaveBeenCalledWith(expectedCommand1, { cwd: mockCwd, shell: true })
    expect(spawn).toHaveBeenCalledWith(expectedCommand2, { cwd: mockCwd, shell: true })
  })

  it('should stop execution if one of the commands fails', async () => {
    const mockCwd = '/mock/directory'
    const mockStdout1 = 'Command 1 executed'
    const mockStdout2 = 'Command 2 failed'
    const mockCommand = 'cmd1 && cmd2'
    process.env.POST_WRITE_LINT = mockCommand
    vi.mocked(getWorkingDirectory).mockReturnValue(mockCwd)

    const mockSpawn1 = {
      stdout: { on: vi.fn((event, cb) => event === 'data' && cb(Buffer.from(mockStdout1))) },
      stderr: { on: vi.fn() },
      on: vi.fn((event, cb) => event === 'close' && cb(0)),
    }
    vi.mocked(spawn).mockReturnValueOnce(mockSpawn1 as unknown as ReturnType<typeof spawn>)

    const mockSpawn2 = {
      stdout: { on: vi.fn((event, cb) => event === 'data' && cb(Buffer.from(mockStdout2))) },
      stderr: { on: vi.fn() },
      on: vi.fn((event, cb) => event === 'close' && cb(1)),
    }
    vi.mocked(spawn).mockReturnValueOnce(mockSpawn2 as unknown as ReturnType<typeof spawn>)

    const result = (await executePostWriteCommand('test.txt')) as ExecuteResult
    expect(result).toEqual({
      stdout: 'Command 1 executed\nCommand 2 failed',
      stderr: '',
      code: 1,
      command: mockCommand,
    })
  })
})
