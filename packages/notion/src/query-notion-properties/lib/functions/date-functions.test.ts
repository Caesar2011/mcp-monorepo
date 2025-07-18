/**
 * Tests for date function implementations
 */

import { describe, expect, test } from 'vitest'

import {
  convertDateFunctionToFilter,
  convertDateFunctionToValue,
  isDateFunction,
  processDateArithmetic,
  extractDatePart,
  parseDateArithmeticExpression,
  parseDatePartExpression,
  getDateRange,
  validateDateFunction,
  getSupportedDateFunctions,
  type DateFunctionName,
  type DatePartFunction,
  type DateInterval,
} from './date-functions.js'

describe('Date Functions', () => {
  describe('convertDateFunctionToFilter', () => {
    test('should convert NEXT_WEEK to filter', () => {
      const result = convertDateFunctionToFilter('__NEXT_WEEK__')
      expect(result).toEqual({ next_week: {} })
    })

    test('should convert PAST_MONTH to filter', () => {
      const result = convertDateFunctionToFilter('__PAST_MONTH__')
      expect(result).toEqual({ past_month: {} })
    })

    test('should convert THIS_YEAR to filter', () => {
      const result = convertDateFunctionToFilter('__THIS_YEAR__')
      expect(result).toEqual({ this_year: {} })
    })

    test('should convert TODAY to equals filter', () => {
      const result = convertDateFunctionToFilter('__TODAY__')
      expect(result).toHaveProperty('equals')
      expect(typeof result.equals).toBe('string')
      expect(result.equals).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    test('should convert NOW to equals filter', () => {
      const result = convertDateFunctionToFilter('__NOW__')
      expect(result).toHaveProperty('equals')
      expect(typeof result.equals).toBe('string')
      expect(result.equals).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    test('should throw error for unknown function', () => {
      expect(() => {
        convertDateFunctionToFilter('__UNKNOWN_FUNCTION__')
      }).toThrow('Unknown date function')
    })
  })

  describe('convertDateFunctionToValue', () => {
    test('should convert TODAY to date string', () => {
      const result = convertDateFunctionToValue('__TODAY__')
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    test('should convert NOW to datetime string', () => {
      const result = convertDateFunctionToValue('__NOW__')
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    test('should return placeholder for relative functions', () => {
      const result = convertDateFunctionToValue('__NEXT_WEEK__')
      expect(result).toBe('__NEXT_WEEK__')
    })
  })

  describe('isDateFunction', () => {
    test('should identify date functions', () => {
      expect(isDateFunction('__NEXT_WEEK__')).toBe(true)
      expect(isDateFunction('PAST_MONTH')).toBe(true)
      expect(isDateFunction('TODAY')).toBe(true)
      expect(isDateFunction('NOW')).toBe(true)
    })

    test('should reject non-date functions', () => {
      expect(isDateFunction('CURRENT_USER')).toBe(false)
      expect(isDateFunction('LENGTH')).toBe(false)
      expect(isDateFunction('not_a_function')).toBe(false)
      expect(isDateFunction('')).toBe(false)
    })

    test('should handle non-string input', () => {
      expect(isDateFunction(123 as never)).toBe(false)
      expect(isDateFunction(null as never)).toBe(false)
      expect(isDateFunction(undefined as never)).toBe(false)
    })
  })

  describe('processDateArithmetic', () => {
    test('should add days to date', () => {
      const result = processDateArithmetic('DATE_ADD', '2023-12-01', 7, 'DAY')
      expect(result).toBe('2023-12-08T00:00:00.000Z')
    })

    test('should subtract months from date', () => {
      const result = processDateArithmetic('DATE_SUB', '2023-12-01', 2, 'MONTH')
      expect(result).toBe('2023-10-01T00:00:00.000Z')
    })

    test('should add years to date', () => {
      const result = processDateArithmetic('DATE_ADD', '2023-01-01', 1, 'YEAR')
      expect(result).toBe('2024-01-01T00:00:00.000Z')
    })

    test('should handle Date objects', () => {
      const date = new Date('2023-12-01')
      const result = processDateArithmetic('DATE_ADD', date, 1, 'WEEK')
      expect(result).toBe('2023-12-08T00:00:00.000Z')
    })

    test('should throw error for invalid date', () => {
      expect(() => {
        processDateArithmetic('DATE_ADD', 'invalid-date', 1, 'DAY')
      }).toThrow('Invalid date for DATE_ADD')
    })

    test('should throw error for invalid interval', () => {
      expect(() => {
        processDateArithmetic('DATE_ADD', '2023-12-01', 1, 'INVALID' as DateInterval)
      }).toThrow('Unsupported date interval')
    })
  })

  describe('extractDatePart', () => {
    test('should extract year', () => {
      const result = extractDatePart('YEAR', '2023-12-01')
      expect(result).toBe(2023)
    })

    test('should extract month', () => {
      const result = extractDatePart('MONTH', '2023-12-01')
      expect(result).toBe(12)
    })

    test('should extract day', () => {
      const result = extractDatePart('DAY', '2023-12-01')
      expect(result).toBe(1)
    })

    test('should extract weekday', () => {
      const result = extractDatePart('WEEKDAY', '2023-12-01') // Friday
      expect(result).toBe('Friday')
    })

    test('should handle Date objects', () => {
      const date = new Date('2023-12-01')
      const result = extractDatePart('YEAR', date)
      expect(result).toBe(2023)
    })

    test('should throw error for invalid date', () => {
      expect(() => {
        extractDatePart('YEAR', 'invalid-date')
      }).toThrow('Invalid date for YEAR')
    })

    test('should throw error for invalid function', () => {
      expect(() => {
        extractDatePart('INVALID' as DatePartFunction, '2023-12-01')
      }).toThrow('Unsupported date part function')
    })
  })

  describe('parseDateArithmeticExpression', () => {
    test('should parse DATE_ADD expression', () => {
      const result = parseDateArithmeticExpression('DATE_ADD(NOW(), INTERVAL 7 DAY)')
      expect(result).toEqual({
        function: 'DATE_ADD',
        baseDate: 'NOW()',
        interval: 7,
        unit: 'DAY',
      })
    })

    test('should parse DATE_SUB expression', () => {
      const result = parseDateArithmeticExpression("DATE_SUB('2023-12-01', INTERVAL 1 MONTH)")
      expect(result).toEqual({
        function: 'DATE_SUB',
        baseDate: "'2023-12-01'",
        interval: 1,
        unit: 'MONTH',
      })
    })

    test('should handle case insensitive input', () => {
      const result = parseDateArithmeticExpression('date_add(now(), interval 5 week)')
      expect(result.function).toBe('DATE_ADD')
      expect(result.unit).toBe('WEEK')
    })

    test('should throw error for invalid expression', () => {
      expect(() => {
        parseDateArithmeticExpression('INVALID_EXPRESSION')
      }).toThrow('Invalid date arithmetic expression')
    })
  })

  describe('parseDatePartExpression', () => {
    test('should parse YEAR expression', () => {
      const result = parseDatePartExpression("YEAR('2023-12-01')")
      expect(result).toEqual({
        function: 'YEAR',
        dateValue: '2023-12-01',
      })
    })

    test('should parse MONTH expression with column reference', () => {
      const result = parseDatePartExpression('MONTH("Due Date")')
      expect(result).toEqual({
        function: 'MONTH',
        dateValue: 'Due Date',
      })
    })

    test('should throw error for invalid expression', () => {
      expect(() => {
        parseDatePartExpression('INVALID(value)')
      }).toThrow('Invalid date part expression')
    })
  })

  describe('getDateRange', () => {
    test('should get THIS_WEEK range', () => {
      const result = getDateRange('THIS_WEEK')
      expect(result).toHaveProperty('start')
      expect(result).toHaveProperty('end')
      expect(result.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    test('should get NEXT_MONTH range', () => {
      const result = getDateRange('NEXT_MONTH')
      expect(result).toHaveProperty('start')
      expect(result).toHaveProperty('end')
      expect(new Date(result.start).getTime()).toBeGreaterThan(Date.now())
    })

    test('should get PAST_YEAR range', () => {
      const result = getDateRange('PAST_YEAR')
      expect(result).toHaveProperty('start')
      expect(result).toHaveProperty('end')
      expect(new Date(result.end).getTime()).toBeLessThan(Date.now())
    })

    test('should throw error for invalid function', () => {
      expect(() => {
        getDateRange('TODAY' as DateFunctionName)
      }).toThrow('Cannot get date range for function')
    })
  })

  describe('validateDateFunction', () => {
    test('should validate simple date functions', () => {
      const result = validateDateFunction('TODAY')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should validate date arithmetic functions', () => {
      const result = validateDateFunction('DATE_ADD', ['2023-12-01', 'INTERVAL 7 DAY'])
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should validate date part functions', () => {
      const result = validateDateFunction('YEAR', ['2023-12-01'])
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should reject unknown functions', () => {
      const result = validateDateFunction('UNKNOWN_FUNCTION')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Unknown date function: UNKNOWN_FUNCTION')
    })

    test('should reject wrong argument count', () => {
      const result = validateDateFunction('TODAY', ['unexpected_arg'])
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('TODAY takes no arguments')
    })

    test('should reject missing arguments for arithmetic functions', () => {
      const result = validateDateFunction('DATE_ADD', ['only_one_arg'])
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('DATE_ADD requires exactly 2 arguments (base_date, interval)')
    })
  })

  describe('getSupportedDateFunctions', () => {
    test('should return all supported function categories', () => {
      const result = getSupportedDateFunctions()

      expect(result).toHaveProperty('relative')
      expect(result).toHaveProperty('arithmetic')
      expect(result).toHaveProperty('parts')

      expect(result.relative).toContain('NEXT_WEEK')
      expect(result.relative).toContain('PAST_MONTH')
      expect(result.relative).toContain('THIS_YEAR')
      expect(result.relative).toContain('TODAY')
      expect(result.relative).toContain('NOW')

      expect(result.arithmetic).toContain('DATE_ADD')
      expect(result.arithmetic).toContain('DATE_SUB')

      expect(result.parts).toContain('YEAR')
      expect(result.parts).toContain('MONTH')
      expect(result.parts).toContain('DAY')
      expect(result.parts).toContain('WEEKDAY')
    })

    test('should have correct array lengths', () => {
      const result = getSupportedDateFunctions()

      expect(result.relative).toHaveLength(11) // All relative date functions
      expect(result.arithmetic).toHaveLength(2) // DATE_ADD, DATE_SUB
      expect(result.parts).toHaveLength(4) // YEAR, MONTH, DAY, WEEKDAY
    })
  })
})
