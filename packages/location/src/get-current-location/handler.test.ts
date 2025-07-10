import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatCurrentLocationResponse, formatError } from './formatter.js'
import { getCurrentLocationHandler } from './handler.js'
import { getCurrentLocationData } from './helper.js'

import type { ProcessedLocationData } from './types.js'

// Mock all dependencies
vi.mock('./helper.js', () => ({
  getCurrentLocationData: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatCurrentLocationResponse: vi.fn(),
  formatError: vi.fn(),
}))

describe('getCurrentLocationHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return formatted current location data on success', async () => {
    // Arrange
    const mockLocationData: ProcessedLocationData = {
      ipAddress: '8.8.8.8',
      location: 'Mountain View, California, United States',
      coordinates: { lat: 37.386, lon: -122.0838 },
    }
    const mockFormattedResponse =
      'Current Location Information:\n\nIP Address: 8.8.8.8\nLocation: Mountain View, California, United States'

    vi.mocked(getCurrentLocationData).mockResolvedValue(mockLocationData)
    vi.mocked(formatCurrentLocationResponse).mockReturnValue(mockFormattedResponse)

    // Act
    const result = await getCurrentLocationHandler()

    // Assert
    expect(getCurrentLocationData).toHaveBeenCalledOnce()
    expect(formatCurrentLocationResponse).toHaveBeenCalledWith(mockLocationData)
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: mockFormattedResponse,
        },
      ],
    })
  })

  it('should handle error when getCurrentLocationData fails', async () => {
    // Arrange
    const error = new Error('Failed to get current IP address')
    const errorMessage = 'Error getting current location: Failed to get current IP address'

    vi.mocked(getCurrentLocationData).mockRejectedValue(error)
    vi.mocked(formatError).mockReturnValue(errorMessage)

    // Act
    const result = await getCurrentLocationHandler()

    // Assert
    expect(getCurrentLocationData).toHaveBeenCalledOnce()
    expect(formatError).toHaveBeenCalledWith(error)
    expect(formatCurrentLocationResponse).not.toHaveBeenCalled()
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: 'Failed to get current IP address' },
        },
      ],
    })
  })

  it('should handle non-Error exceptions', async () => {
    // Arrange
    const stringError = 'Network failure'
    const errorMessage = 'Error getting current location: Unknown error'

    vi.mocked(getCurrentLocationData).mockRejectedValue(stringError)
    vi.mocked(formatError).mockReturnValue(errorMessage)

    // Act
    const result = await getCurrentLocationHandler()

    // Assert
    expect(formatError).toHaveBeenCalledWith(stringError)
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: 'Unknown error' },
        },
      ],
    })
  })

  it('should handle null/undefined exceptions', async () => {
    // Arrange
    const errorMessage = 'Error getting current location: Unknown error'

    vi.mocked(getCurrentLocationData).mockRejectedValue(undefined)
    vi.mocked(formatError).mockReturnValue(errorMessage)

    // Act
    const result = await getCurrentLocationHandler()

    // Assert
    expect(formatError).toHaveBeenCalledWith(undefined)
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: 'Unknown error' },
        },
      ],
    })
  })
})
