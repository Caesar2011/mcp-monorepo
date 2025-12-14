import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { getSlackEnv } from './env.js'

describe('env', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset process.env to a clean state
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('getSlackEnv', () => {
    it('should return environment variables when all are present', () => {
      process.env.XOXD_TOKEN = 'test-xoxd-token'
      process.env.XOXC_TOKEN = 'test-xoxc-token'
      process.env.TENANT_ID = 'T123456789'

      const result = getSlackEnv()

      expect(result).toEqual({
        XOXD_TOKEN: 'test-xoxd-token',
        XOXC_TOKEN: 'test-xoxc-token',
        TENANT_ID: 'T123456789',
      })
    })

    it('should throw error when XOXD_TOKEN is missing', () => {
      process.env.XOXC_TOKEN = 'test-xoxc-token'
      process.env.TENANT_ID = 'T123456789'
      delete process.env.XOXD_TOKEN

      expect(() => getSlackEnv()).toThrow(
        'Missing required Slack environment variables: XOXD_TOKEN, XOXC_TOKEN, TENANT_ID',
      )
    })

    it('should throw error when XOXC_TOKEN is missing', () => {
      process.env.XOXD_TOKEN = 'test-xoxd-token'
      process.env.TENANT_ID = 'T123456789'
      delete process.env.XOXC_TOKEN

      expect(() => getSlackEnv()).toThrow(
        'Missing required Slack environment variables: XOXD_TOKEN, XOXC_TOKEN, TENANT_ID',
      )
    })

    it('should throw error when TENANT_ID is missing', () => {
      process.env.XOXD_TOKEN = 'test-xoxd-token'
      process.env.XOXC_TOKEN = 'test-xoxc-token'
      delete process.env.TENANT_ID

      expect(() => getSlackEnv()).toThrow(
        'Missing required Slack environment variables: XOXD_TOKEN, XOXC_TOKEN, TENANT_ID',
      )
    })

    it('should throw error when all environment variables are missing', () => {
      delete process.env.XOXD_TOKEN
      delete process.env.XOXC_TOKEN
      delete process.env.TENANT_ID

      expect(() => getSlackEnv()).toThrow(
        'Missing required Slack environment variables: XOXD_TOKEN, XOXC_TOKEN, TENANT_ID',
      )
    })

    it('should throw error when XOXD_TOKEN is empty string', () => {
      process.env.XOXD_TOKEN = ''
      process.env.XOXC_TOKEN = 'test-xoxc-token'
      process.env.TENANT_ID = 'T123456789'

      expect(() => getSlackEnv()).toThrow(
        'Missing required Slack environment variables: XOXD_TOKEN, XOXC_TOKEN, TENANT_ID',
      )
    })

    it('should throw error when XOXC_TOKEN is empty string', () => {
      process.env.XOXD_TOKEN = 'test-xoxd-token'
      process.env.XOXC_TOKEN = ''
      process.env.TENANT_ID = 'T123456789'

      expect(() => getSlackEnv()).toThrow(
        'Missing required Slack environment variables: XOXD_TOKEN, XOXC_TOKEN, TENANT_ID',
      )
    })

    it('should throw error when TENANT_ID is empty string', () => {
      process.env.XOXD_TOKEN = 'test-xoxd-token'
      process.env.XOXC_TOKEN = 'test-xoxc-token'
      process.env.TENANT_ID = ''

      expect(() => getSlackEnv()).toThrow(
        'Missing required Slack environment variables: XOXD_TOKEN, XOXC_TOKEN, TENANT_ID',
      )
    })

    it('should throw error when multiple environment variables are missing', () => {
      process.env.XOXD_TOKEN = 'test-xoxd-token'
      delete process.env.XOXC_TOKEN
      delete process.env.TENANT_ID

      expect(() => getSlackEnv()).toThrow(
        'Missing required Slack environment variables: XOXD_TOKEN, XOXC_TOKEN, TENANT_ID',
      )
    })

    it('should handle environment variables with special characters', () => {
      process.env.XOXD_TOKEN = 'xoxd-test%2Btoken%2Fwith%2Bspecial%2Bchars'
      process.env.XOXC_TOKEN = 'xoxc-test-token-with-dashes-123456789'
      process.env.TENANT_ID = 'T123ABC456'

      const result = getSlackEnv()

      expect(result).toEqual({
        XOXD_TOKEN: 'xoxd-test%2Btoken%2Fwith%2Bspecial%2Bchars',
        XOXC_TOKEN: 'xoxc-test-token-with-dashes-123456789',
        TENANT_ID: 'T123ABC456',
      })
    })

    it('should handle environment variables with whitespace', () => {
      process.env.XOXD_TOKEN = '  test-xoxd-token  '
      process.env.XOXC_TOKEN = '  test-xoxc-token  '
      process.env.TENANT_ID = '  T123456789  '

      const result = getSlackEnv()

      expect(result).toEqual({
        XOXD_TOKEN: '  test-xoxd-token  ',
        XOXC_TOKEN: '  test-xoxc-token  ',
        TENANT_ID: '  T123456789  ',
      })
    })

    it('should return the same result on multiple calls', () => {
      process.env.XOXD_TOKEN = 'test-xoxd-token'
      process.env.XOXC_TOKEN = 'test-xoxc-token'
      process.env.TENANT_ID = 'T123456789'

      const result1 = getSlackEnv()
      const result2 = getSlackEnv()

      expect(result1).toEqual(result2)
      expect(result1).toEqual({
        XOXD_TOKEN: 'test-xoxd-token',
        XOXC_TOKEN: 'test-xoxc-token',
        TENANT_ID: 'T123456789',
      })
    })
  })
})
