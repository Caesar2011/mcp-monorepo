import { access, mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'

import { findProjectRoot, RefreshablePromise } from '@mcp-monorepo/shared'
import { logger } from '@mcp-monorepo/shared'
import ical, { type VEvent } from 'node-ical'

import { type CalendarSource, type RawIcalEvent, type RRuleLike } from './types.js'

export const getIcsUrls = (): CalendarSource[] => {
  const envVars = process.env
  const calendarSources: CalendarSource[] = []

  Object.keys(envVars).forEach((key) => {
    const ENV_PREFIX = 'CALENDAR_'
    if (key.startsWith(ENV_PREFIX)) {
      const url = envVars[key]
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        const name = key.substring(ENV_PREFIX.length)
        calendarSources.push({ name, url })
      } else {
        throw new Error(`Invalid URL for environment variable ${key}: ${url}`)
      }
    }
  })

  if (calendarSources.length === 0) {
    throw new Error('No valid ICS URLs provided in environment variables.')
  }

  return calendarSources
}

export const parseIcsContent = async (icsContent: string, source: string): Promise<RawIcalEvent[]> => {
  const entries = Object.values(await ical.async.parseICS(icsContent))
  return entries
    .filter((e) => e.type === 'VEVENT')
    .map((event: VEvent) => {
      return {
        uid: event.uid,
        summary: event.summary,
        description: event.description,
        location: event.location,
        dtstart: event.start,
        dtend: event.end,
        allDay: event.datetype === 'date',
        source,
        rrule: event.rrule as RRuleLike | undefined,
        rruleOptions: event.rrule ? (event.rrule as RRuleLike).origOptions : undefined,
      }
    })
}

async function refreshEvents(): Promise<{
  events: RawIcalEvent[]
  errors: string[]
}> {
  const sources = getIcsUrls()
  logger.info('Refreshing events from: ', sources)
  const events: RawIcalEvent[] = []
  const errors: string[] = []

  for (const source of sources) {
    try {
      const dataFile = join(
        await findProjectRoot(import.meta.dirname),
        'data',
        'ics',
        source.url.replace(/[^a-zA-Z0-9]/g, '_') + '.json',
      )
      if (
        await access(dataFile).then(
          () => true,
          () => false,
        )
      ) {
        logger.info('File found. Using cache of: ' + source.name + ' path: ' + dataFile)
        const data = await readFile(dataFile, 'utf-8')
        const parsed = JSON.parse(data)
        events.push(...parsed)
      } else {
        logger.info('File not found. Fetching source: ' + source.name + ' url: ' + source.url)
        const icsContent = await fetch(source.url)
        if (!(icsContent && icsContent.ok)) throw new Error(`Fetch failed for ${source.url}`)
        const text = await icsContent.text()
        const parsed = await parseIcsContent(text, source.name)
        await mkdir(dirname(dataFile), { recursive: true })
        await writeFile(dataFile, JSON.stringify(parsed))
        events.push(...parsed)
      }
    } catch (e) {
      logger.error(e)
      errors.push(`${source.name}: ${(e as Error).message}`)
    }
  }
  errors.forEach((e) => logger.error(e))
  return {
    events,
    errors,
  }
}

export const rawEvents = new RefreshablePromise(refreshEvents)
