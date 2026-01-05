import * as cheerio from 'cheerio'

import { ParsingError } from '../internal/errors.js'
import { GERMAN_LITERALS, PLAN_TYPE_MAP, type HtmlFragmentApiResponse, GERMAN_MONTHS } from '../types/internal.types.js'
import {
  type Activity,
  type ActivityDetails,
  type ActivitySearchParams,
  type BookingStatus,
} from '../types/public.types.js'

import type { InternalHttpClient } from '../internal/http-client.js'

export type ActivitiesAPI = ReturnType<typeof createActivitiesApi>

/**
 * Creates an API object for fetching activities/classes.
 * @param http The internal HTTP client.
 * @internal
 */
export function createActivitiesApi(http: InternalHttpClient) {
  /**
   * Parses the HTML content string to extract structured activity data from a search result.
   */
  const _parseActivitiesSearchHtml = (htmlContent: string): Activity[] => {
    const activities: Activity[] = []
    const $ = cheerio.load(htmlContent)

    $('.smm-class-snippet.row').each((_, element) => {
      const snippet = $(element)
      const dataLayerString = snippet.find('a.smm-class-link').first().attr('data-datalayer')
      if (!dataLayerString) return

      try {
        const dataLayer = JSON.parse(dataLayerString) as {
          class?: {
            id?: number
            name?: string
            category?: string
          }
        }
        const classData = dataLayer.class
        if (!classData?.id || !classData?.name) return

        const venueLink = snippet.find('.smm-studio-link').first()
        const venueSlug = (venueLink.attr('href') ?? '').split('/').pop() ?? ''

        // The API returns times like "10:30 &mdash; 11:45"
        const timeText = snippet.find('.smm-class-snippet__class-time').text()
        const [startTime, endTime] = timeText.match(/\d{2}:\d{2}/g) ?? []

        activities.push({
          id: classData.id.toString(),
          name: classData.name.trim(),
          category: classData.category?.trim(),
          district: snippet.find('.district').text().trim() || 'N/A',
          venueName: venueLink.text().trim(),
          venueSlug: venueSlug,
          type: snippet.find('.smm-booking-state-label.is_online').length > 0 ? 'live' : 'onsite',
          startTime,
          endTime,
        })
      } catch {
        // Ignore snippets that fail to parse
      }
    })

    return activities
  }

  /**
   * Parses the HTML of a single class details page.
   */
  const _parseActivityDetailsHtml = (html: string): ActivityDetails => {
    const $ = cheerio.load(html)
    const clean = (text?: string) => (text ?? '').trim().replace(/\s\s+/g, ' ')

    const mainDiv = $('div.smm-class-details')
    const id = mainDiv.attr('data-appointment-id')
    if (!id) {
      throw new ParsingError('Could not find activity ID on the details page.')
    }

    const name = clean(mainDiv.find('.smm-class-details__panel.general h3').text())

    // --- Date and Time Parsing ---
    const dateTimeText = clean(mainDiv.find('p.smm-class-details__datetime').text())
    const cancellationHint = clean(mainDiv.find('p.smm-class-details__hint.cancellation').text())
    const yearMatch = cancellationHint.match(/(\d{2})\.(\d{2})\.(\d{2,4})/)
    const year = yearMatch ? (yearMatch[3].length === 2 ? `20${yearMatch[3]}` : yearMatch[3]) : ''
    const dateMatch = dateTimeText.match(/(\d{1,2})\.\s(\w+)/)
    const day = dateMatch ? dateMatch[1] : ''
    const monthName = dateMatch ? dateMatch[2] : ''
    const monthIndex = GERMAN_MONTHS[monthName]
    const timeMatch = dateTimeText.match(/(\d{2}:\d{2})\s*—\s*(\d{2}:\d{2})/)
    const startTime = timeMatch ? timeMatch[1] : ''
    const endTime = timeMatch ? timeMatch[2] : ''

    let date = new Date(0)
    if (day && monthIndex !== undefined && year) {
      date = new Date(`${year}-${(monthIndex + 1).toString().padStart(2, '0')}-${day.padStart(2, '0')}`)
    }

    // --- Core Details ---
    const imageUrl =
      (mainDiv.find('.smm-class-details__image').attr('style') ?? '').match(/url\('?(.*?)'?\)/)?.[1] ?? ''
    const description = clean(mainDiv.find('.smm-class-details__pre-line.class-description').text()) || undefined
    const instructor = clean(mainDiv.find('p.smm-class-details__hint:has(span.teacher)').text()) || undefined

    // --- Rating ---
    const ratingScore = parseFloat(mainDiv.find('.rating__score').text())
    const ratingCount = parseInt(mainDiv.find('.rating__votes').text().replace(/[()]/g, ''), 10)
    const rating = !isNaN(ratingScore) && !isNaN(ratingCount) ? { score: ratingScore, count: ratingCount } : undefined

    // --- Venue Details ---
    const fullAddressText = clean(mainDiv.find('p.smm-class-details__hint:has(span.full-address)').text())
    const [venueName, ...addressParts] = fullAddressText.split(',')
    const disciplinesText = clean(mainDiv.find('p.smm-class-details__hint:has(span.disciplines)').text())

    // --- Hints and Policies ---
    const visitLimits = clean(mainDiv.find('p:has(span.visit-limits) .smm-class-details__pre-line').text()) || undefined
    const generalInfo =
      clean(mainDiv.find('p:has(span.important-info) .smm-class-details__pre-line').text()) || undefined

    // --- Plans and Status ---
    const applicablePlans = mainDiv
      .find('.smm-class-details__class-plan')
      .map((_, el) => clean($(el).text()))
      .get()

    const statusText = clean(mainDiv.find('.smm-booking-state-label').text())
    let bookingStatus: BookingStatus = 'Unknown'
    if (statusText === GERMAN_LITERALS.STATUS_BOOKED) bookingStatus = 'Booked'
    if (statusText === GERMAN_LITERALS.STATUS_SCHEDULED) bookingStatus = 'Scheduled'
    if (statusText === GERMAN_LITERALS.STATUS_CHECKED_IN) bookingStatus = 'CheckedIn'
    if (statusText === GERMAN_LITERALS.STATUS_CANCELLED) bookingStatus = 'Cancelled'
    if (statusText === GERMAN_LITERALS.STATUS_MISSED) bookingStatus = 'Missed'

    // --- Map ---
    let map: ActivityDetails['map'] | undefined
    const mapData = mainDiv.find('.usc-google-map').attr('data-static-map-urls')
    if (mapData) {
      try {
        map = { staticMaps: JSON.parse(mapData) }
      } catch {
        /* ignore parsing errors for map */
      }
    }

    return {
      id,
      name,
      date,
      startTime,
      endTime,
      imageUrl,
      description,
      instructor,
      bookingStatus,
      rating,
      venue: {
        name: clean(venueName),
        address: addressParts.join(',').trim(),
        disciplines: disciplinesText ? disciplinesText.split(',').map((s) => s.trim()) : [],
      },
      hints: {
        visitLimits,
        general: generalInfo,
        cancellation: cancellationHint || undefined,
      },
      applicablePlans,
      map,
    }
  }

  return {
    /**
     * Retrieves the full details for a single activity.
     * Requires authentication to see user-specific booking status.
     * @param activityId The ID of the activity/class.
     * @returns A promise that resolves to a detailed `ActivityDetails` object.
     */
    async get(activityId: string): Promise<ActivityDetails> {
      const response = await http.get(`/class-details/${activityId}`, true)
      const html = await response.text()
      return _parseActivityDetailsHtml(html)
    },

    /**
     * Searches for activities (classes or free training) on a specific date.
     * If the user is authenticated and no `cityId` is provided, it automatically uses the user's home region.
     * @param params - The search parameters.
     * @returns A promise resolving to an object with the list of activities and a boolean indicating if more pages are available.
     */
    async search(params: ActivitySearchParams): Promise<{ activities: Activity[]; hasMore: boolean }> {
      const search = new URLSearchParams()
      if (params.cityId) search.append('city_id', params.cityId.toString())
      search.append('date', params.date.toISOString().split('T')[0])
      search.append('service_type', (params.serviceType ?? 0).toString())

      if (params.plan) {
        search.append('plan_type', PLAN_TYPE_MAP[params.plan].toString())
      }
      params.types?.forEach((type) => search.append('type[]', type))
      if (params.page) {
        search.append('page', params.page.toString())
      }

      const response = await http.get(`/activities?${search.toString()}`)
      const json = (await response.json()) as unknown

      const isApiResponse = (obj: unknown): obj is HtmlFragmentApiResponse =>
        typeof obj === 'object' &&
        !!obj &&
        'success' in obj &&
        'data' in obj &&
        typeof obj.data === 'object' &&
        !!obj.data &&
        'content' in obj.data &&
        typeof obj.data.content === 'string'

      if (!isApiResponse(json) || !json.success) {
        throw new ParsingError('Invalid response format from activities API.')
      }

      const activities = _parseActivitiesSearchHtml(json.data.content)

      return {
        activities,
        hasMore: json.data.showMore,
      }
    },
  }
}
