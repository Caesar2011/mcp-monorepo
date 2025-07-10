/**
 * Tests for IP utilities
 */

import { describe, it, expect, vi } from 'vitest'

import { isValidIpAddress, getCurrentIpAddress } from './ip-utils.js'

describe('IP Utils', () => {
  describe('isValidIpAddress', () => {
    it('should validate IPv4 addresses correctly', () => {
      expect(isValidIpAddress('192.168.1.1')).toBe(true)
      expect(isValidIpAddress('8.8.8.8')).toBe(true)
      expect(isValidIpAddress('255.255.255.255')).toBe(true)
      expect(isValidIpAddress('0.0.0.0')).toBe(true)
    })

    it('should reject invalid IPv4 addresses', () => {
      expect(isValidIpAddress('256.1.1.1')).toBe(false)
      expect(isValidIpAddress('192.168.1')).toBe(false)
      expect(isValidIpAddress('192.168.1.1.1')).toBe(false)
      expect(isValidIpAddress('not-an-ip')).toBe(false)
    })

    it('should validate IPv6 addresses correctly', () => {
      expect(isValidIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true)
      expect(isValidIpAddress('fe80:0000:0000:0000:0202:b3ff:fe1e:8329')).toBe(true)
    })

    it('should reject invalid IPv6 addresses', () => {
      expect(isValidIpAddress('2001:0db8:85a3::8a2e:0370:7334:extra')).toBe(false)
      expect(isValidIpAddress('invalid-ipv6')).toBe(false)
    })
  })

  describe('getCurrentIpAddress', () => {
    it('should fetch current IP address successfully', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('203.0.113.1'),
      })

      const ip = await getCurrentIpAddress()
      expect(ip).toBe('203.0.113.1')
      expect(fetch).toHaveBeenCalledWith('https://api.ipify.org?format=text')
    })

    it('should handle HTTP errors', async () => {
      // Mock fetch with error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      await expect(getCurrentIpAddress()).rejects.toThrow('Failed to get current IP address: HTTP error! status: 500')
    })

    it('should handle network errors', async () => {
      // Mock fetch with network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await expect(getCurrentIpAddress()).rejects.toThrow('Failed to get current IP address: Network error')
    })
  })
})
