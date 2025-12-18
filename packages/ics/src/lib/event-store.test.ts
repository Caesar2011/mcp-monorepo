import { mkdir, readFile, writeFile } from 'fs/promises'
import * as os from 'node:os'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ical, { type DateWithTimeZone, type VEvent } from 'node-ical'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getIcsUrls, parseIcsContent, convertEvent, refreshEvents, throwForNoIcsUrls } from './event-store.js'

import type * as EventStore from './event-store.js'
import type * as Shared from '@mcp-monorepo/shared'

// Mock dependencies before any other code in the module is executed.
// Vitest hoists these calls.
vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

vi.mock('node-ical', () => ({
  default: {
    async: {
      parseICS: vi.fn(),
    },
  },
}))

vi.mock('./event-store.js', async (importOriginal) => {
  const original = await importOriginal<typeof EventStore>()
  return {
    ...original,
    throwForNoIcsUrls: vi.fn(), // Mock the throwing function to do nothing by default
  }
})

vi.mock('@mcp-monorepo/shared', async (importOriginal) => {
  // Using a static type import to avoid `import()` type annotation error
  const original = await importOriginal<typeof Shared>()
  return {
    ...original,
    findProjectRoot: vi.fn().mockResolvedValue('/fake/project/root'),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  }
})

const BASE_VEVENT: VEvent = {
  class: undefined,
  completion: '',
  created: undefined,
  datetype: undefined,
  description: '',
  dtstamp: undefined,
  end: undefined,
  exdate: undefined,
  geo: undefined,
  lastmodified: undefined,
  location: '',
  method: undefined,
  organizer: undefined,
  params: [],
  recurrenceid: undefined,
  sequence: '',
  start: undefined,
  summary: '',
  transparency: undefined,
  type: 'VEVENT',
  uid: '',
  url: '',
}

// Helper to create a Date that satisfies the DateWithTimeZone type from node-ical
function createDateWithTz(dateString: string): DateWithTimeZone {
  const date = new Date(dateString)
  return Object.assign(date, { tz: 'Etc/UTC' })
}

describe('event-store', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getIcsUrls', () => {
    it('should parse valid calendar URLs from environment variables', () => {
      process.env.CALENDAR_WORK = 'https://valid.url/work.ics'
      process.env.CALENDAR_HOME = 'http://valid.url/home.ics'
      process.env.NOT_A_CALENDAR = 'some-other-value'

      const sources = getIcsUrls()
      expect(sources).toHaveLength(2)
      expect(sources).toContainEqual({ name: 'WORK', url: 'https://valid.url/work.ics' })
      expect(sources).toContainEqual({ name: 'HOME', url: 'http://valid.url/home.ics' })
    })

    it('should throw an error if no calendar URLs are provided', async () => {
      process.env = { NODE_ENV: 'test' } // Clear relevant vars
      // Restore the original throwing behavior for this test only
      const { throwForNoIcsUrls: originalThrow } = await vi.importActual<typeof EventStore>('./event-store.js')
      vi.mocked(throwForNoIcsUrls).mockImplementationOnce(originalThrow)

      expect(() => getIcsUrls()).toThrow('No valid ICS URLs provided in environment variables.')
    })

    it('should throw an error for an invalid URL', () => {
      process.env.CALENDAR_BAD = 'ftp://invalid.url/work.ics'
      expect(() => getIcsUrls()).toThrow(
        'Invalid URL for environment variable CALENDAR_BAD: ftp://invalid.url/work.ics',
      )
    })

    it('should throw an error for an empty URL', () => {
      process.env.CALENDAR_EMPTY = ''
      expect(() => getIcsUrls()).toThrow(/Invalid URL for environment variable CALENDAR_EMPTY/)
    })
  })

  describe('convertEvent', () => {
    it('should convert a VEvent to a RawIcalEvent', () => {
      const vevent: VEvent = {
        ...BASE_VEVENT,
        type: 'VEVENT',
        uid: '123',
        summary: 'My Event',
        description: 'A description',
        location: 'A location',
        start: createDateWithTz('2025-01-01T10:00:00Z'),
        end: createDateWithTz('2025-01-01T11:00:00Z'),
        datetype: 'date-time',
        status: 'CONFIRMED',
      }
      const result = convertEvent(vevent, 'test-source')
      expect(result).toEqual({
        uid: '123',
        summary: 'My Event',
        description: 'A description',
        location: 'A location',
        dtstart: vevent.start,
        dtend: vevent.end,
        allDay: false,
        source: 'test-source',
        rrule: undefined,
        rruleOptions: undefined,
        exdate: undefined,
        recurrences: undefined,
        status: 'CONFIRMED',
      })
    })

    it('should correctly identify an all-day event', () => {
      const vevent: VEvent = {
        ...BASE_VEVENT,
        type: 'VEVENT',
        uid: '456',
        summary: 'All Day Event',
        start: createDateWithTz('2025-01-01T00:00:00Z'),
        end: createDateWithTz('2025-01-02T00:00:00Z'),
        datetype: 'date',
      }
      const result = convertEvent(vevent, 'test-source')
      expect(result.allDay).toBe(true)
    })

    it('should recursively convert recurrences', () => {
      const recurrenceVEvent: VEvent = {
        ...BASE_VEVENT,
        type: 'VEVENT',
        uid: '789-rec',
        summary: 'Modified Recurrence',
        start: createDateWithTz('2025-01-08T12:00:00Z'),
        end: createDateWithTz('2025-01-08T13:00:00Z'),
      }
      const vevent: VEvent = {
        ...BASE_VEVENT,
        type: 'VEVENT',
        uid: '789',
        summary: 'Weekly Meeting',
        start: createDateWithTz('2025-01-01T10:00:00Z'),
        end: createDateWithTz('2025-01-01T11:00:00Z'),
        recurrences: {
          '20250108T120000Z': recurrenceVEvent,
        },
      }
      const result = convertEvent(vevent, 'test-source')
      expect(result.recurrences).toBeDefined()
      if (result.recurrences) {
        const recKey = Object.keys(result.recurrences)[0]
        expect(recKey).toBe('20250108T120000Z')
        expect(result.recurrences[recKey].summary).toBe('Modified Recurrence')
        expect(result.recurrences[recKey].source).toBe('test-source')
      }
    })
  })

  describe('parseIcsContent', () => {
    it('should parse ICS content and return RawIcalEvents', async () => {
      const mockVEvent: VEvent = {
        ...BASE_VEVENT,
        type: 'VEVENT',
        uid: '1',
        summary: 'Event 1',
        start: createDateWithTz('2025-01-01T10:00:00Z'),
      }
      vi.mocked(ical.async.parseICS).mockResolvedValue({ '1': mockVEvent })

      const result = await parseIcsContent('BEGIN:VCALENDAR...', 'test-source')
      expect(result).toHaveLength(1)
      expect(result[0].uid).toBe('1')
    })

    it('should filter out non-VEVENT entries', async () => {
      vi.mocked(ical.async.parseICS).mockResolvedValue({
        '1': { type: 'VEVENT', uid: '1', summary: 'Event 1', start: createDateWithTz('2025-01-01T10:00:00Z') },
        '2': { type: 'VTODO', summary: 'A Todo' },
      })

      const result = await parseIcsContent('...', 'test-source')
      expect(result).toHaveLength(1)
      expect(result[0].uid).toBe('1')
    })
  })

  describe('refreshEvents', () => {
    const mockFetch = vi.fn()

    beforeEach(() => {
      global.fetch = mockFetch
      process.env.CALENDAR_WORK = 'https://work.com/cal.ics'
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should fetch, parse, and cache events on success', async () => {
      const icsData = 'BEGIN:VCALENDAR...'
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => icsData,
      })

      const mockVEvent: VEvent = {
        ...BASE_VEVENT,
        type: 'VEVENT',
        uid: '1',
        summary: 'Work Event',
        start: createDateWithTz('2025-01-01T10:00:00Z'),
      }
      vi.mocked(ical.async.parseICS).mockResolvedValue({ '1': mockVEvent })

      const { events, errors } = await refreshEvents()

      expect(events).toHaveLength(1)
      expect(events[0].uid).toBe('1')
      expect(events[0].source).toBe('WORK')
      expect(errors).toHaveLength(0)

      expect(mockFetch).toHaveBeenCalledWith('https://work.com/cal.ics')
      expect(vi.mocked(mkdir)).toHaveBeenCalledWith(
        '/fake/project/root/data/ics'.replace(/\//g, os.platform() === 'win32' ? '\\' : '/'),
        { recursive: true },
      )
      const expectedFilename = '/fake/project/root/data/ics/https___work_com_cal_ics.json'.replace(
        /\//g,
        os.platform() === 'win32' ? '\\' : '/',
      )
      expect(vi.mocked(writeFile)).toHaveBeenCalledWith(expectedFilename, expect.any(String))

      // The argument to writeFile can be string or Uint8Array. Use toString() for a safe assertion.
      const writtenData = vi.mocked(writeFile).mock.calls[0][1]
      expect(JSON.parse(writtenData.toString())).toEqual([expect.objectContaining({ uid: '1' })])
    })

    it('should load from cache if fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const cachedEvent = {
        uid: 'cached-1',
        summary: 'Cached Work Event',
        source: 'WORK',
        dtstart: new Date().toISOString(),
      }
      vi.mocked(readFile).mockResolvedValue(JSON.stringify([cachedEvent]))

      const { events, errors } = await refreshEvents()

      expect(events).toHaveLength(1)
      expect(events[0].uid).toBe('cached-1')
      expect(errors).toHaveLength(0)

      expect(vi.mocked(writeFile)).not.toHaveBeenCalled()
      const expectedFilename = '/fake/project/root/data/ics/https___work_com_cal_ics.json'.replace(
        /\//g,
        os.platform() === 'win32' ? '\\' : '/',
      )
      expect(vi.mocked(readFile)).toHaveBeenCalledWith(expectedFilename, 'utf-8')
    })

    it('should report an error if fetch fails and cache is unavailable', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      vi.mocked(readFile).mockRejectedValue(new Error('File not found'))

      const { events, errors } = await refreshEvents()

      expect(events).toHaveLength(0)
      expect(errors).toHaveLength(1)
      expect(errors[0]).toContain('[WORK] Fetch failed and cache is unavailable or corrupt.')
    })

    it('should report an error if fetch fails and cache is corrupt', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      vi.mocked(readFile).mockResolvedValue('this is not json') // Corrupt cache

      const { events, errors } = await refreshEvents()

      expect(events).toHaveLength(0)
      expect(errors).toHaveLength(1)
      expect(errors[0]).toContain('[WORK] Fetch failed and cache is unavailable or corrupt.')
    })

    it('should handle multiple sources, with one failing and one succeeding', async () => {
      process.env.CALENDAR_HOME = 'https://home.com/cal.ics'

      const cachedHomeEvent = { uid: 'cached-home', summary: 'Cached Home Event', source: 'HOME', dtstart: new Date() }
      const freshWorkEvent: VEvent = {
        ...BASE_VEVENT,
        type: 'VEVENT',
        uid: 'fresh-work',
        summary: 'Fresh Work Event',
        start: createDateWithTz('2025-01-01T12:00:00Z'),
      }

      // WORK calendar succeeds, HOME calendar fails
      mockFetch.mockImplementation(async (url) => {
        if (url === 'https://work.com/cal.ics') {
          return { ok: true, text: async () => 'work_ics' }
        }
        if (url === 'https://home.com/cal.ics') {
          throw new Error('Home fetch failed')
        }
        return { ok: false, status: 404 }
      })

      // Mock parsing for WORK
      vi.mocked(ical.async.parseICS).mockImplementation(async (content) => {
        if (content === 'work_ics') {
          return { 'fresh-work': freshWorkEvent }
        }
        return {}
      })

      // Mock cache read for HOME
      vi.mocked(readFile).mockImplementation(async (path) => {
        if ((path as string).includes('home_com')) {
          return JSON.stringify([cachedHomeEvent])
        }
        throw new Error('File not found')
      })

      const { events, errors } = await refreshEvents()

      expect(errors).toHaveLength(0)
      expect(events).toHaveLength(2)

      const eventUids = events.map((e) => e.uid).sort()
      expect(eventUids).toEqual(['cached-home', 'fresh-work'])

      // Check that work calendar was written to cache
      expect(vi.mocked(writeFile)).toHaveBeenCalledWith(
        expect.stringContaining('work_com'),
        expect.stringContaining('fresh-work'),
      )
      // Check that home calendar was NOT written to cache
      expect(vi.mocked(writeFile)).not.toHaveBeenCalledWith(expect.stringContaining('home_com'), expect.any(String))
    })
  })
})
