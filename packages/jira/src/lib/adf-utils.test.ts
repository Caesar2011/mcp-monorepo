import { describe, expect, it } from 'vitest'

import { adfToMd, isAdf, mdToAdf } from './adf-utils'

describe('adf-utils', () => {
  describe('mdToAdf', () => {
    it('should convert simple markdown to ADF', () => {
      const markdown = 'Hello **world**!'
      const result = mdToAdf(markdown)

      expect(result).toBeDefined()
      expect(result?.type).toBe('doc')
      expect(result?.version).toBe(1)
      expect(result?.content).toBeDefined()
    })

    it('should handle undefined input', () => {
      const result = mdToAdf(undefined)
      expect(result).toBeUndefined()
    })

    it('should handle empty string', () => {
      const result = mdToAdf('')
      expect(result).toBeUndefined()
    })

    it('should convert markdown with headings', () => {
      const markdown = '# Heading 1\n\nSome text'
      const result = mdToAdf(markdown)

      expect(result).toBeDefined()
      expect(result?.content).toBeDefined()
      expect(result?.content.length).toBeGreaterThan(0)
    })

    it('should convert markdown with lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3'
      const result = mdToAdf(markdown)

      expect(result).toBeDefined()
      expect(result?.content).toBeDefined()
    })

    it('should convert markdown with code blocks', () => {
      const markdown = '```javascript\nconst foo = "bar";\n```'
      const result = mdToAdf(markdown)

      expect(result).toBeDefined()
      expect(result?.content).toBeDefined()
    })

    it('should convert markdown with links', () => {
      const markdown = 'Check out [OpenAI](https://openai.com)'
      const result = mdToAdf(markdown)

      expect(result).toBeDefined()
      expect(result?.content).toBeDefined()
    })
  })

  describe('adfToMd', () => {
    it('should convert ADF to markdown', () => {
      const adf = {
        type: 'doc' as const,
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Hello world!',
              },
            ],
          },
        ],
      }

      const result = adfToMd(adf)
      expect(result).toBeDefined()
      expect(result).toContain('Hello world')
    })

    it('should handle undefined input', () => {
      const result = adfToMd(undefined)
      expect(result).toBeUndefined()
    })

    it('should handle string input (v2 format)', () => {
      const input = 'Plain text description'
      const result = adfToMd(input)
      expect(result).toBe(input)
    })

    it('should handle complex ADF with multiple paragraphs', () => {
      const adf = {
        type: 'doc' as const,
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'First paragraph' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Second paragraph' }],
          },
        ],
      }

      const result = adfToMd(adf)
      expect(result).toBeDefined()
      expect(result).toContain('First paragraph')
      expect(result).toContain('Second paragraph')
    })
  })

  describe('isAdf', () => {
    it('should identify valid ADF object', () => {
      const adf = {
        type: 'doc',
        version: 1,
        content: [],
      }

      expect(isAdf(adf)).toBe(true)
    })

    it('should reject string', () => {
      expect(isAdf('not an adf')).toBe(false)
    })

    it('should reject undefined', () => {
      expect(isAdf(undefined)).toBe(false)
    })

    it('should reject null', () => {
      // eslint-disable-next-line no-restricted-syntax
      expect(isAdf(null)).toBe(false)
    })

    it('should reject object without required fields', () => {
      expect(isAdf({ type: 'doc' })).toBe(false)
      expect(isAdf({ version: 1 })).toBe(false)
      expect(isAdf({ content: [] })).toBe(false)
    })

    it('should reject object with wrong type', () => {
      const invalid = {
        type: 'paragraph',
        version: 1,
        content: [],
      }

      expect(isAdf(invalid)).toBe(false)
    })
  })

  describe('markdown ↔ ADF round-trip', () => {
    it('should preserve simple text through round-trip', () => {
      const original = 'Hello world!'
      const adf = mdToAdf(original)
      const result = adfToMd(adf)

      expect(result).toBeDefined()
      expect(result?.trim()).toContain('Hello world')
    })

    it('should preserve bold text through round-trip', () => {
      const original = 'This is **bold** text'
      const adf = mdToAdf(original)
      const result = adfToMd(adf)

      expect(result).toBeDefined()
      expect(result).toContain('**bold**')
    })

    it('should preserve italic text through round-trip', () => {
      const original = 'This is *italic* text'
      const adf = mdToAdf(original)
      const result = adfToMd(adf)

      expect(result).toBeDefined()
      expect(result).toMatch(/\*italic\*|_italic_/)
    })

    it('should preserve headings through round-trip', () => {
      const original = '# Main Heading\n\n## Subheading'
      const adf = mdToAdf(original)
      const result = adfToMd(adf)

      expect(result).toBeDefined()
      expect(result).toContain('# Main Heading')
      expect(result).toContain('## Subheading')
    })
  })
})
