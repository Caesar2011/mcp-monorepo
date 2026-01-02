import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { getSlackEnv } from './env.js'

describe('env', () => {
  const originalEnv = process.env
  const FULL_ERROR_MESSAGE =
    'Missing required Slack environment variables: SLACK_WORKSPACE_URL, XOXD_TOKEN, XOXC_TOKEN, TENANT_ID'

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
      process.env.SLACK_WORKSPACE_URL = 'https://test-workspace.slack.com'
      process.env.XOXD_TOKEN = 'test-xoxd-token'
      process.env.XOXC_TOKEN = 'test-xoxc-token'
      process.env.TENANT_ID = 'T123456789'

      const result = getSlackEnv()

      expect(result).toEqual({
        SLACK_WORKSPACE_URL: 'https://test-workspace.slack.com',
        XOXD_TOKEN: 'test-xoxd-token',
        XOXC_TOKEN: 'test-xoxc-token',
        TENANT_ID: 'T123456789',
      })
    })

    it('should throw error when SLACK_WORKSPACE_URL is missing', () => {
      process.env.XOXD_TOKEN = 'test-xoxd-token'
      process.env.XOXC_TOKEN = 'test-xoxc-token'
      process.env.TENANT_ID = 'T123456789'
      delete process.env.SLACK_WORKSPACE_URL

      expect(() => getSlackEnv()).toThrow(FULL_ERROR_MESSAGE)
    })

    it('should throw error when XOXD_TOKEN is missing', () => {
      process.env.SLACK_WORKSPACE_URL = 'https://test-workspace.slack.com'
      process.env.XOXC_TOKEN = 'test-xoxc-token'
      process.env.TENANT_ID = 'T123456789'
      delete process.env.XOXD_TOKEN

      expect(() => getSlackEnv()).toThrow(FULL_ERROR_MESSAGE)
    })

    it('should throw error when XOXC_TOKEN is missing', () => {
      process.env.SLACK_WORKSPACE_URL = 'https://test-workspace.slack.com'
      process.env.XOXD_TOKEN = 'test-xoxd-token'
      process.env.TENANT_ID = 'T123456789'
      delete process.env.XOXC_TOKEN

      expect(() => getSlackEnv()).toThrow(FULL_ERROR_MESSAGE)
    })

    it('should throw error when TENANT_ID is missing', () => {
      process.env.SLACK_WORKSPACE_URL = 'https://test-workspace.slack.com'
      process.env.XOXD_TOKEN = 'test-xoxd-token'
      process.env.XOXC_TOKEN = 'test-xoxc-token'
      delete process.env.TENANT_ID

      expect(() => getSlackEnv()).toThrow(FULL_ERROR_MESSAGE)
    })

    it('should throw error when all environment variables are missing', () => {
      delete process.env.SLACK_WORKSPACE_URL
      delete process.env.XOXD_TOKEN
      delete process.env.XOXC_TOKEN
      delete process.env.TENANT_ID

      expect(() => getSlackEnv()).toThrow(FULL_ERROR_MESSAGE)
    })

    it('should throw error when SLACK_WORKSPACE_URL is empty string', () => {
      process.env.SLACK_WORKSPACE_URL = ''
      process.env.XOXD_TOKEN = 'test-xoxd-token'
      process.env.XOXC_TOKEN = 'test-xoxc-token'
      process.env.TENANT_ID = 'T123456789'

      expect(() => getSlackEnv()).toThrow(FULL_ERROR_MESSAGE)
    })
  })
})
