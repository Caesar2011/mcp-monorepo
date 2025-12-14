/* eslint-disable */
import { describe, it, expect, beforeEach } from 'vitest'

import { IgnoreFileService } from './ignore-file-service.js'

describe('IgnoreFileService - Static Regex Methods', () => {
  const absDirPath = '/project'

  describe('getExactRegex', () => {
    const testCases = [
      { pattern: '*.js', expected: /^.*\/[^/]*\.js/i },
      { pattern: 'src/*.js', expected: /^.*\/src\/[^/]*\.js/i },
      { pattern: '**/test/*.js', expected: /^.*\/test\/[^/]*\.js/i },
      { pattern: '/absolute/path/*.js', expected: /^\/project\/absolute\/path\/[^/]*\.js/i },
      { pattern: 'folder/**', expected: /^.*\/folder\/.*/i },
      { pattern: 'file?.txt', expected: /^.*\/file[^/]\.txt/i },
      { pattern: 'dir[0-9]/', expected: /^.*\/dir[0-9]\//i },
    ]

    testCases.forEach(({ pattern, expected }) => {
      it(`should generate correct exact regex for pattern "${pattern}"`, () => {
        const regex = IgnoreFileService.getExactRegex(absDirPath, pattern)
        expect(regex).toEqual(expected)
      })
    })
  })

  describe('getPartialRegex', () => {
    const testCases = [
      { pattern: '*.js', expected: /^.*\//i },
      { pattern: 'src/*.js', expected: /^.*\//i },
      { pattern: '**/test/*.js', expected: /^.*\//i },
      { pattern: '/absolute/path/*.js', expected: /^\/project\/absolute\/path\/[^/]*\.js/i },
      { pattern: 'folder/**', expected: /^.*\//i },
      { pattern: 'file?.txt', expected: /^.*\//i },
      { pattern: 'dir[0-9]/', expected: /^.*\//i },
    ]

    testCases.forEach(({ pattern, expected }) => {
      it(`should generate correct partial regex for pattern "${pattern}"`, () => {
        const regex = IgnoreFileService.getPartialRegex(absDirPath, pattern)
        expect(regex).toEqual(expected)
      })
    })
  })
})

describe('IgnoreFileService - Non-Async Tests', () => {
  let ignoreService: IgnoreFileService

  beforeEach(() => {
    ignoreService = new IgnoreFileService()
  })

  describe('couldDirectoryContainAllowedFiles', () => {
    const testCases = [
      {
        ignoreContent: ['src/', '!src/components/'].join('\n'),
        dirPath: '/project/src',
        expected: true,
      },
      {
        ignoreContent: ['src/', '!src/components/'].join('\n'),
        dirPath: '/project/src/components',
        expected: true,
      },
      {
        ignoreContent: ['src/', '!/src/components/'].join('\n'),
        dirPath: '/project/src/config',
        expected: false,
      },
      {
        ignoreContent: ['src/', 'components/'].join('\n'),
        dirPath: '/project/src/config',
        expected: false,
      },
      {
        ignoreContent: ['src/', '!src/components/'].join('\n'),
        dirPath: '/project/tests',
        expected: true,
      },
    ]

    testCases.forEach(({ ignoreContent, dirPath, expected }) => {
      it(`should return ${expected} for directory "${dirPath}"`, () => {
        ignoreService.addByContent('/project', ignoreContent)
        console.log('ignoreContent: ', ignoreContent, dirPath, expected)
        const result = ignoreService.couldDirectoryContainAllowedFiles(dirPath)
        expect(result).toBe(expected)
      })
    })
  })

  describe('isFileIgnored', () => {
    const testCases = [
      {
        ignoreContent: ['*.log', '!debug.log'].join('\n'),
        filePath: '/project/debug.log',
        expected: false,
      },
      {
        ignoreContent: ['*.log', '!debug.log'].join('\n'),
        filePath: '/project/error.log',
        expected: true,
      },
      {
        ignoreContent: ['*.log', '!debug.log'].join('\n'),
        filePath: '/project/src/index.js',
        expected: false,
      },
    ]

    testCases.forEach(({ ignoreContent, filePath, expected }) => {
      it(`should return ${expected} for file "${filePath}"`, () => {
        ignoreService.addByContent('/project', ignoreContent)
        const result = ignoreService.isPathIgnored(filePath)
        expect(result).toBe(expected)
      })
    })
  })
})
