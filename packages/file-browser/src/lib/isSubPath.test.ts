import { describe, it, expect } from 'vitest'

import { isSubPath } from './isSubPath'

describe('isSubPath', () => {
  type TestCase = {
    parent: string
    possibleChild: string
    expected: boolean
  }

  it.each<TestCase>([
    // Absolute paths
    { parent: '/home/user', possibleChild: '/home/user/docs', expected: true },
    { parent: 'C:\\Users\\Admin', possibleChild: 'C:\\Users\\Admin\\Documents', expected: true },
    { parent: '/var/www', possibleChild: '/var/www/html', expected: true },
    { parent: '/var/www', possibleChild: '/var/www', expected: true },
    { parent: '/home/user', possibleChild: '/etc/passwd', expected: false },

    // Relative paths
    { parent: '.', possibleChild: './src', expected: true },
    { parent: './src', possibleChild: './src/utils', expected: true },
    { parent: './src', possibleChild: './tests', expected: false },
    { parent: './src', possibleChild: './src', expected: true },

    // Non-path strings
    { parent: 'foo', possibleChild: 'foo/bar', expected: true },
    { parent: 'foo', possibleChild: 'bar', expected: false },

    // Edge cases
    { parent: '', possibleChild: '', expected: true }, // Both are empty
    { parent: '', possibleChild: '/home/user', expected: false }, // Parent is empty
    { parent: '/home/user', possibleChild: '', expected: false }, // Possible child is empty
    { parent: '/home/user', possibleChild: '/home/user', expected: true }, // Same path

    // Different roots
    { parent: '/home/user', possibleChild: '/var/www', expected: false },
    { parent: 'C:\\Users\\Admin', possibleChild: 'D:\\Documents', expected: false },
  ])(
    'returns $expected for parent: "$parent" and possibleChild: "$possibleChild"',
    ({ parent, possibleChild, expected }) => {
      const result = isSubPath(parent, possibleChild)
      expect(result).toBe(expected)
    },
  )
})
