import { spawn } from 'child_process'

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { executeCommand } from './executeCommand.js'

vi.mock('child_process')

describe('executeNpmCommand', () => {
  let mockStdout, mockStderr, eventHandlers, mockProcess

  beforeEach(() => {
    mockStdout = { on: vi.fn() }
    mockStderr = { on: vi.fn() }
    eventHandlers = {}
    mockProcess = {
      stdout: mockStdout,
      stderr: mockStderr,
      on: (event, cb) => {
        eventHandlers[event] = cb
      },
    }
    vi.mocked(spawn).mockReturnValue(mockProcess)
    mockStdout.on.mockImplementation((_, cb) => {
      mockStdout.cb = cb
    })
    mockStderr.on.mockImplementation((_, cb) => {
      mockStderr.cb = cb
    })
  })

  it('returns correct stdout, stderr, and code on success', async () => {
    const promise = executeCommand('npm', ['run', 'foo'], '/path')
    // Simulate output
    mockStdout.cb(Buffer.from('hello'))
    mockStderr.cb(Buffer.from('warning'))
    // Simulate close event
    eventHandlers['close'](0)
    const result = await promise
    expect(result).toEqual({ stdout: 'hello', stderr: 'warning', code: 0 })
  })

  it('returns code 1 and error message on spawn error', async () => {
    const promise = executeCommand('npm', ['bad'], '/badpath')
    // Simulate error event
    eventHandlers['error'](new Error('Fail!'))
    const result = await promise
    expect(result.stderr).toContain('Fail!')
    expect(result.code).toBe(1)
  })
})
