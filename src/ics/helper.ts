import ical from 'node-ical'

interface CalendarSource {
  name: string
  url: string
}

export const getIcsUrls = (): CalendarSource[] => {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error(
      'Error: No ICS URLs provided as arguments. Usage: ts-node src/helper.ts [<name>=]<url> [<name>=]<url> ...',
    )
    process.exit(1)
  }

  const sources: CalendarSource[] = []

  for (const arg of args) {
    let name: string
    let url: string

    if (arg.includes('=')) {
      const [prefix, ...urlParts] = arg.split('=')
      name = prefix as string
      url = urlParts.join('=')
    } else {
      url = arg
      name = `Calendar ${sources.length + 1}`
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      console.error(`Error: Only HTTP/HTTPS URLs are supported. Invalid URL: ${url}`)
      process.exit(1)
    }

    sources.push({ name, url })
  }

  return sources
}

// Simple ICS parser for basic event extraction
export interface CalendarEvent {
  uid: string
  summary: string
  description: string
  location: string
  dtstart: Date
  dtend: Date
  allDay: boolean
  source: string
}

export const parseIcsContent = async (icsContent: string, source: string): Promise<CalendarEvent[]> => {
  const entries = Object.values(await ical.async.parseICS(icsContent))
  return entries
    .filter((entry) => entry.type === 'VEVENT')
    .map(
      (event) =>
        ({
          uid: event.uid,
          summary: event.summary,
          description: event.description,
          location: event.location,
          dtstart: event.start,
          dtend: event.end,
          allDay: event.datetype === 'date',
          source: source,
        }) satisfies CalendarEvent,
    )
}

// Format date for display
export const formatDate = (date: Date, allDay: boolean = false): string => {
  if (allDay) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } else {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}
