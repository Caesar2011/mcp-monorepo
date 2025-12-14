import { describe, it, expect, beforeEach } from 'vitest'

import { IgnoreFileService } from './ignore-file-service.js'

describe('IgnoreFileService', () => {
  let service: IgnoreFileService

  beforeEach(() => {
    service = new IgnoreFileService()
  })

  describe('isPathIgnored', () => {
    it('should ignore files matching a simple glob', () => {
      service.addByContent('/project', '*.log')
      expect(service.isPathIgnored('/project/debug.log')).toBe(true)
      expect(service.isPathIgnored('/project/src/error.log')).toBe(true)
    })

    it('should not ignore files that do not match', () => {
      service.addByContent('/project', '*.log')
      expect(service.isPathIgnored('/project/index.js')).toBe(false)
    })

    it('should handle directory ignores', () => {
      service.addByContent('/project', 'node_modules/')
      expect(service.isPathIgnored('/project/node_modules/express/index.js')).toBe(true)
      expect(service.isPathIgnored('/project/node_modules')).toBe(true)
    })

    it('should respect allow rules (!)', () => {
      service.addByContent('/project', '*.log\n!important.log')
      expect(service.isPathIgnored('/project/debug.log')).toBe(true)
      expect(service.isPathIgnored('/project/important.log')).toBe(false)
    })

    it('should respect rule precedence (last rule wins)', () => {
      service.addByContent('/project', '*.log\n!important.log\nimportant.log')
      expect(service.isPathIgnored('/project/important.log')).toBe(true)
    })

    it('should handle nested .gitignore files correctly', () => {
      service.addByContent('/project', 'dist/')
      service.addByContent('/project/dist', '!index.html')
      expect(service.isPathIgnored('/project/dist/bundle.js')).toBe(true)
      expect(service.isPathIgnored('/project/dist/index.html')).toBe(false)
    })
  })

  describe('couldDirectoryContainAllowedFiles', () => {
    it('should return false for a completely ignored directory', () => {
      service.addByContent('/project', 'logs/')
      expect(service.couldDirectoryContainAllowedFiles('/project/logs')).toBe(false)
    })

    it('should return true for a non-ignored directory', () => {
      service.addByContent('/project', 'logs/')
      expect(service.couldDirectoryContainAllowedFiles('/project/src')).toBe(true)
    })

    it('should return true for an ignored directory that contains an allow rule', () => {
      service.addByContent('/project', 'dist/\n!dist/index.html')
      expect(service.couldDirectoryContainAllowedFiles('/project/dist')).toBe(true)
    })

    it('should handle complex nested allow/deny rules', () => {
      const gitignoreContent = `
        .*
        !/.well-known/
        /.well-known/*
        !/.well-known/assetlinks.json
      `
      service.addByContent('/project', gitignoreContent)
      expect(service.couldDirectoryContainAllowedFiles('/project/.config')).toBe(false)
      expect(service.couldDirectoryContainAllowedFiles('/project/.well-known')).toBe(true)
    })
  })
})
