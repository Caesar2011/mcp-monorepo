import { describe, it, expect, vi } from 'vitest'

import { mvHandler } from './handler.js'
import { movePaths } from './helper.js'

vi.mock('./helper.js', () => ({
  movePaths: vi.fn(),
}))

describe('mvHandler', () => {
  it('should return success response when paths are moved successfully', async () => {
    const params = {
      sourcePaths: ['source1.txt', 'source2.txt'],
      targetPaths: ['target1.txt', 'target2.txt'],
    }

    const movedPaths = [
      { source: 'source1.txt', target: 'target1.txt' },
      { source: 'source2.txt', target: 'target2.txt' },
    ]

    vi.mocked(movePaths).mockResolvedValue(movedPaths)

    const result = await mvHandler(params)

    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('Successfully moved the following paths:')
    expect(result.content[0].text).toContain('source1.txt -> target1.txt')
    expect(result.content[0].text).toContain('source2.txt -> target2.txt')
  })

  it('should return error response when movePaths throws an error', async () => {
    const params = {
      sourcePaths: ['source1.txt'],
      targetPaths: ['target1.txt'],
    }

    vi.mocked(movePaths).mockRejectedValue(new Error('Move operation failed'))

    const result = await mvHandler(params)

    expect(result.content[0].type).toBe('text')
    expect(result.content[0].text).toContain('Error: Move operation failed')
  })
})
