import { describe, it, expect } from 'vitest'

import { formatTreeResponse, formatTreeError } from './formatter.js'

import type { TreeToolResult, TreeNode } from './types.js'

describe('tree formatter', () => {
  describe('formatTreeResponse', () => {
    it('should format a simple tree structure', () => {
      const treeNode: TreeNode = {
        name: 'root',
        type: 'DIR',
        path: '.',
        children: [
          {
            name: 'file1.txt',
            type: 'FILE',
            size: 100,
            path: 'file1.txt',
          },
          {
            name: 'subdir',
            type: 'DIR',
            path: 'subdir',
            children: [],
          },
        ],
      }

      const result: TreeToolResult = {
        tree: treeNode,
        totalFiles: 1,
        totalDirectories: 2,
        maxDepthReached: 1,
        truncated: false,
      }

      const formatted = formatTreeResponse(result)

      expect(formatted).toContain('📁 Tree Summary:')
      expect(formatted).toContain('Files: 1')
      expect(formatted).toContain('Directories: 2')
      expect(formatted).toContain('Max Depth Reached: 1')
      expect(formatted).toContain('"name": "root"')
      expect(formatted).toContain('"type": "DIR"')
      expect(formatted).toContain('"file1.txt"')
      expect(formatted).toContain('"size": 100')
    })

    it('should show truncated warning when results are truncated', () => {
      const treeNode: TreeNode = {
        name: 'root',
        type: 'DIR',
        path: '.',
        children: [],
      }

      const result: TreeToolResult = {
        tree: treeNode,
        totalFiles: 150,
        totalDirectories: 50,
        maxDepthReached: 3,
        truncated: true,
      }

      const formatted = formatTreeResponse(result)

      expect(formatted).toContain('⚠️ Results truncated (200+ items)')
      expect(formatted).toContain('Files: 150')
      expect(formatted).toContain('Directories: 50')
    })

    it('should format empty tree', () => {
      const treeNode: TreeNode = {
        name: 'root',
        type: 'DIR',
        path: '.',
        children: [],
      }

      const result: TreeToolResult = {
        tree: treeNode,
        totalFiles: 0,
        totalDirectories: 1,
        maxDepthReached: 0,
        truncated: false,
      }

      const formatted = formatTreeResponse(result)

      expect(formatted).toContain('Files: 0')
      expect(formatted).toContain('Directories: 1')
      expect(formatted).toContain('Max Depth Reached: 0')
      expect(formatted).toContain('"children": []')
    })

    it('should handle nested directory structure', () => {
      const treeNode: TreeNode = {
        name: 'root',
        type: 'DIR',
        path: '.',
        children: [
          {
            name: 'src',
            type: 'DIR',
            path: 'src',
            children: [
              {
                name: 'components',
                type: 'DIR',
                path: 'src/components',
                children: [
                  {
                    name: 'Button.tsx',
                    type: 'FILE',
                    size: 1500,
                    path: 'src/components/Button.tsx',
                  },
                ],
              },
            ],
          },
        ],
      }

      const result: TreeToolResult = {
        tree: treeNode,
        totalFiles: 1,
        totalDirectories: 3,
        maxDepthReached: 3,
        truncated: false,
      }

      const formatted = formatTreeResponse(result)

      expect(formatted).toContain('"src"')
      expect(formatted).toContain('"components"')
      expect(formatted).toContain('"Button.tsx"')
      expect(formatted).toContain('"size": 1500')
      expect(formatted).toContain('Max Depth Reached: 3')
      expect(formatted).toContain('"children"')
    })

    it('should format files without children property', () => {
      const treeNode: TreeNode = {
        name: 'root',
        type: 'DIR',
        path: '.',
        children: [
          {
            name: 'document.pdf',
            type: 'FILE',
            size: 2048000,
            path: 'document.pdf',
            // No children property for files
          },
        ],
      }

      const result: TreeToolResult = {
        tree: treeNode,
        totalFiles: 1,
        totalDirectories: 1,
        maxDepthReached: 1,
        truncated: false,
      }

      const formatted = formatTreeResponse(result)

      expect(formatted).toContain('"document.pdf"')
      expect(formatted).toContain('"type": "FILE"')
      expect(formatted).toContain('"size": 2048000')

      // The file node should not have a children property
      const fileNodeMatch = formatted.match(/"name": "document\.pdf"[^}]+}/)
      expect(fileNodeMatch?.[0]).not.toContain('"children"')
    })
  })

  describe('formatTreeError', () => {
    it('should format Error objects', () => {
      const error = new Error('Permission denied')
      const formatted = formatTreeError(error)

      expect(formatted).toBe('Tree Error: Permission denied')
    })

    it('should handle non-Error objects', () => {
      const error = 'String error'
      const formatted = formatTreeError(error)

      expect(formatted).toBe('Tree Error: Unknown error occurred')
    })

    it('should handle null/undefined errors', () => {
      // eslint-disable-next-line no-restricted-syntax
      expect(formatTreeError(null)).toBe('Tree Error: Unknown error occurred')
      expect(formatTreeError(undefined)).toBe('Tree Error: Unknown error occurred')
    })

    it('should handle object errors', () => {
      const error = { message: 'Object error' }
      const formatted = formatTreeError(error)

      expect(formatted).toBe('Tree Error: Unknown error occurred')
    })
  })
})
