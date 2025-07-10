import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatLocationByIpResponse, formatError } from './formatter.js'
import { getLocationByIpHandler } from './handler.js'
import { validateInput, getLocationByIpData } from './helper.js'

import type { GetLocationByIpParams, ProcessedLocationData } from './types.js'

// Mock all dependencies
vi.mock('./helper.js', () => ({
  validateInput: vi.fn(),
  getLocationByIpData: vi.fn(),
}))

vi.mock('./formatter.js', () => ({
  formatLocationByIpResponse: vi.fn(),
  formatError: vi.fn(),
}))
describe('getLocationByIpHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return formatted location data on success', async () => {
    // Arrange
    const params: GetLocationByIpParams = { ipAddress: '8.8.8.8' }
    const validatedParams = { ipAddress: '8.8.8.8' }
    const mockLocationData: ProcessedLocationData = {
      ipAddress: '8.8.8.8',
      location: 'Mountain View, California, United States',
      coordinates: { lat: 37.386, lon: -122.0838 },
    }
    const mockFormattedResponse =
      'Location Information for 8.8.8.8:\n\nIP Address: 8.8.8.8\nLocation: Mountain View, California, United States'

    vi.mocked(validateInput).mockReturnValue(validatedParams)
    vi.mocked(getLocationByIpData).mockResolvedValue(mockLocationData)
    vi.mocked(formatLocationByIpResponse).mockReturnValue(mockFormattedResponse)

    // Act
    const result = await getLocationByIpHandler(params)

    // Assert
    expect(validateInput).toHaveBeenCalledWith(params)
    expect(getLocationByIpData).toHaveBeenCalledWith(validatedParams)
    expect(formatLocationByIpResponse).toHaveBeenCalledWith(mockLocationData)
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: mockFormattedResponse,
        },
      ],
    })
  })

  it('should handle validation error', async () => {
    // Arrange
    const params: GetLocationByIpParams = { ipAddress: 'invalid-ip' }
    const error = new Error('Invalid IP address format')
    const errorMessage = 'Error getting location for IP invalid-ip: Invalid IP address format'

    vi.mocked(validateInput).mockImplementation(() => {
      throw error
    })
    vi.mocked(formatError).mockReturnValue(errorMessage)

    // Act
    const result = await getLocationByIpHandler(params)

    // Assert
    expect(validateInput).toHaveBeenCalledWith(params)
    expect(getLocationByIpData).not.toHaveBeenCalled()
    expect(formatError).toHaveBeenCalledWith(error, params.ipAddress)
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: 'Invalid IP address format' },
        },
      ],
    })
  })

  it('should handle data fetching error', async () => {
    // Arrange
    const params: GetLocationByIpParams = { ipAddress: '8.8.8.8' }
    const validatedParams = { ipAddress: '8.8.8.8' }
    const error = new Error('Network timeout')
    const errorMessage = 'Error getting location for IP 8.8.8.8: Network timeout'

    vi.mocked(validateInput).mockReturnValue(validatedParams)
    vi.mocked(getLocationByIpData).mockRejectedValue(error)
    vi.mocked(formatError).mockReturnValue(errorMessage)

    // Act
    const result = await getLocationByIpHandler(params)

    // Assert
    expect(validateInput).toHaveBeenCalledWith(params)
    expect(getLocationByIpData).toHaveBeenCalledWith(validatedParams)
    expect(formatError).toHaveBeenCalledWith(error, params.ipAddress)
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: 'Network timeout' },
        },
      ],
    })
  })

  it('should handle non-Error exceptions', async () => {
    // Arrange
    const params: GetLocationByIpParams = { ipAddress: '1.1.1.1' }
    const validatedParams = { ipAddress: '1.1.1.1' }
    const stringError = 'API limit exceeded'
    const errorMessage = 'Error getting location for IP 1.1.1.1: Unknown error'

    vi.mocked(validateInput).mockReturnValue(validatedParams)
    vi.mocked(getLocationByIpData).mockRejectedValue(stringError)
    vi.mocked(formatError).mockReturnValue(errorMessage)

    // Act
    const result = await getLocationByIpHandler(params)

    // Assert
    expect(formatError).toHaveBeenCalledWith(stringError, params.ipAddress)
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

  it('should handle missing ipAddress in params during error', async () => {
    // Arrange
    const params = {} as GetLocationByIpParams
    const error = new Error('ipAddress is required')
    const errorMessage = 'Error getting location: ipAddress is required'

    vi.mocked(validateInput).mockImplementation(() => {
      throw error
    })
    vi.mocked(formatError).mockReturnValue(errorMessage)

    // Act
    const result = await getLocationByIpHandler(params)

    // Assert
    expect(formatError).toHaveBeenCalledWith(error, undefined)
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: errorMessage,
          _meta: { stderr: 'ipAddress is required' },
        },
      ],
    })
  })
})
