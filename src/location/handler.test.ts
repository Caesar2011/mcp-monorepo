import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCurrentLocationHandler, getLocationByIpHandler } from './handler.js'

// Mock all helper functions
vi.mock('./helpers.js', () => ({
  getCurrentIpAddress: vi.fn(),
  fetchLocationByIp: vi.fn(),
  formatLocationData: vi.fn(),
  isValidIpAddress: vi.fn(),
}))

import {
  getCurrentIpAddress,
  fetchLocationByIp,
  formatLocationData,
  isValidIpAddress,
  IpLocationResponse,
} from './helpers.js'

describe('Location Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentLocationHandler', () => {
    it('should return formatted current location data on success', async () => {
      // Arrange
      const mockIp = '192.168.1.1'
      const mockLocationData: IpLocationResponse = { query: '', status: 'success', city: 'New York', country: 'US' }
      const mockFormattedData = 'City: New York\nCountry: US'

      vi.mocked(getCurrentIpAddress).mockResolvedValue(mockIp)
      vi.mocked(fetchLocationByIp).mockResolvedValue(mockLocationData)
      vi.mocked(formatLocationData).mockReturnValue(mockFormattedData)

      // Act
      const result = await getCurrentLocationHandler()

      // Assert
      expect(getCurrentIpAddress).toHaveBeenCalledOnce()
      expect(fetchLocationByIp).toHaveBeenCalledWith(mockIp)
      expect(formatLocationData).toHaveBeenCalledWith(mockLocationData)
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Current Location Information:\n\n${mockFormattedData}`,
          },
        ],
      })
    })

    it('should handle error when getCurrentIpAddress fails', async () => {
      // Arrange
      const errorMessage = 'Failed to get IP address'
      vi.mocked(getCurrentIpAddress).mockRejectedValue(new Error(errorMessage))

      // Act
      const result = await getCurrentLocationHandler()

      // Assert
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Error getting current location: ${errorMessage}`,
            _meta: { stderr: errorMessage },
          },
        ],
      })
      expect(fetchLocationByIp).not.toHaveBeenCalled()
      expect(formatLocationData).not.toHaveBeenCalled()
    })

    it('should handle error when fetchLocationByIp fails', async () => {
      // Arrange
      const mockIp = '192.168.1.1'
      const errorMessage = 'Location service unavailable'

      vi.mocked(getCurrentIpAddress).mockResolvedValue(mockIp)
      vi.mocked(fetchLocationByIp).mockRejectedValue(new Error(errorMessage))

      // Act
      const result = await getCurrentLocationHandler()

      // Assert
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Error getting current location: ${errorMessage}`,
            _meta: { stderr: errorMessage },
          },
        ],
      })
      expect(formatLocationData).not.toHaveBeenCalled()
    })

    it('should handle error when formatLocationData fails', async () => {
      // Arrange
      const mockIp = '192.168.1.1'
      const mockLocationData: IpLocationResponse = { query: '', status: 'success', city: 'New York', country: 'US' }
      const errorMessage = 'Formatting failed'

      vi.mocked(getCurrentIpAddress).mockResolvedValue(mockIp)
      vi.mocked(fetchLocationByIp).mockResolvedValue(mockLocationData)
      vi.mocked(formatLocationData).mockImplementation(() => {
        throw new Error(errorMessage)
      })

      // Act
      const result = await getCurrentLocationHandler()

      // Assert
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Error getting current location: ${errorMessage}`,
            _meta: { stderr: errorMessage },
          },
        ],
      })
    })

    it('should handle non-Error exceptions', async () => {
      // Arrange
      vi.mocked(getCurrentIpAddress).mockRejectedValue('String error')

      // Act
      const result = await getCurrentLocationHandler()

      // Assert
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error getting current location: Unknown error',
            _meta: { stderr: 'Unknown error' },
          },
        ],
      })
    })
  })

  describe('getLocationByIpHandler', () => {
    it('should return formatted location data for valid IP address', async () => {
      // Arrange
      const mockIp = '8.8.8.8'
      const mockLocationData: IpLocationResponse = {
        query: '',
        status: 'success',
        city: 'Mountain View',
        country: 'US',
      }
      const mockFormattedData = 'City: Mountain View\nCountry: US'

      vi.mocked(isValidIpAddress).mockReturnValue(true)
      vi.mocked(fetchLocationByIp).mockResolvedValue(mockLocationData)
      vi.mocked(formatLocationData).mockReturnValue(mockFormattedData)

      // Act
      const result = await getLocationByIpHandler({ ipAddress: mockIp })

      // Assert
      expect(isValidIpAddress).toHaveBeenCalledWith(mockIp)
      expect(fetchLocationByIp).toHaveBeenCalledWith(mockIp)
      expect(formatLocationData).toHaveBeenCalledWith(mockLocationData)
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Location Information for ${mockIp}:\n\n${mockFormattedData}`,
          },
        ],
      })
    })

    it('should return error for invalid IP address format', async () => {
      // Arrange
      const invalidIp = '999.999.999.999'
      vi.mocked(isValidIpAddress).mockReturnValue(false)

      // Act
      const result = await getLocationByIpHandler({ ipAddress: invalidIp })

      // Assert
      expect(isValidIpAddress).toHaveBeenCalledWith(invalidIp)
      expect(fetchLocationByIp).not.toHaveBeenCalled()
      expect(formatLocationData).not.toHaveBeenCalled()
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Error: Invalid IP address format: ${invalidIp}`,
            _meta: { stderr: 'Invalid IP address format' },
          },
        ],
      })
    })

    it('should handle error when fetchLocationByIp fails with valid IP', async () => {
      // Arrange
      const mockIp = '8.8.8.8'
      const errorMessage = 'API rate limit exceeded'

      vi.mocked(isValidIpAddress).mockReturnValue(true)
      vi.mocked(fetchLocationByIp).mockRejectedValue(new Error(errorMessage))

      // Act
      const result = await getLocationByIpHandler({ ipAddress: mockIp })

      // Assert
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Error getting location for IP ${mockIp}: ${errorMessage}`,
            _meta: { stderr: errorMessage },
          },
        ],
      })
      expect(formatLocationData).not.toHaveBeenCalled()
    })

    it('should handle error when formatLocationData fails', async () => {
      // Arrange
      const mockIp = '8.8.8.8'
      const mockLocationData: IpLocationResponse = {
        query: '',
        status: 'success',
        city: 'Mountain View',
        country: 'US',
      }
      const errorMessage = 'Data formatting error'

      vi.mocked(isValidIpAddress).mockReturnValue(true)
      vi.mocked(fetchLocationByIp).mockResolvedValue(mockLocationData)
      vi.mocked(formatLocationData).mockImplementation(() => {
        throw new Error(errorMessage)
      })

      // Act
      const result = await getLocationByIpHandler({ ipAddress: mockIp })

      // Assert
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Error getting location for IP ${mockIp}: ${errorMessage}`,
            _meta: { stderr: errorMessage },
          },
        ],
      })
    })

    it('should handle non-Error exceptions', async () => {
      // Arrange
      const mockIp = '8.8.8.8'
      vi.mocked(isValidIpAddress).mockReturnValue(true)
      vi.mocked(fetchLocationByIp).mockRejectedValue(null)

      // Act
      const result = await getLocationByIpHandler({ ipAddress: mockIp })

      // Assert
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Error getting location for IP ${mockIp}: Unknown error`,
            _meta: { stderr: 'Unknown error' },
          },
        ],
      })
    })

    it('should handle empty IP address string', async () => {
      // Arrange
      const emptyIp = ''
      vi.mocked(isValidIpAddress).mockReturnValue(false)

      // Act
      const result = await getLocationByIpHandler({ ipAddress: emptyIp })

      // Assert
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Invalid IP address format: ',
            _meta: { stderr: 'Invalid IP address format' },
          },
        ],
      })
    })

    it('should handle malformed IP addresses', async () => {
      // Arrange
      const malformedIps = ['192.168', '192.168.1', '192.168.1.1.1', 'not-an-ip', '192.168.1.256']

      for (const ip of malformedIps) {
        vi.mocked(isValidIpAddress).mockReturnValue(false)

        // Act
        const result = await getLocationByIpHandler({ ipAddress: ip })

        // Assert
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: `Error: Invalid IP address format: ${ip}`,
              _meta: { stderr: 'Invalid IP address format' },
            },
          ],
        })
      }
    })
  })
})
