import { describe, it, expect, vi } from 'vitest'

import { rmHandler } from './handler.js'
import * as helper from './helper.js'

vi.mock('./helper.js')

describe('rmHandler', () => {
  it('should delete given paths successfully', async () => {
    const mockPaths = ['file1.txt', 'folder1']
    vi.spyOn(helper, 'removePaths').mockResolvedValue(mockPaths)

    const result = await rmHandler({ paths: mockPaths })

    expect(result.content[0].text).toContain('Successfully deleted the following paths')
    expect(result.content[0].text).toContain('file1.txt')
    expect(result.content[0].text).toContain('folder1')
  })

  it('should return an error message if deletion fails', async () => {
    vi.spyOn(helper, 'removePaths').mockRejectedValue(new Error('Deletion failed'))

    const result = await rmHandler({ paths: ['file1.txt'] })

    expect(result.content[0].text).toContain('Error: Deletion failed')
    expect(result.content[0]._meta?.stderr).toBe('Deletion failed')
  })
})
