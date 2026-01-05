import * as cheerio from 'cheerio'
import { type AnyNode } from 'domhandler'

import { ParsingError } from '../internal/errors.js'
import { GERMAN_LITERALS, GERMAN_MONTHS, type HtmlFragmentApiResponse } from '../types/internal.types.js'
import { type Booking, type BookingStatus, type Membership } from '../types/public.types.js'

import type { InternalHttpClient } from '../internal/http-client.js'

export type AccountAPI = ReturnType<typeof createAccountApi>

/**
 * Parses a German date string (DD.MM.YYYY) into a Date object.
 */
const parseGermanDate = (dateStr: string | undefined): Date => {
  if (!dateStr) return new Date(0)
  const parts = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  if (!parts) return new Date(0)
  return new Date(`${parts[3]}-${parts[2]}-${parts[1]}`)
}

/**
 * Creates an API object for user-account-related actions.
 * @param http The internal HTTP client.
 * @internal
 */
export function createAccountApi(http: InternalHttpClient) {
  const _parseMembershipPage = (membershipHtml: string, venuesHtml: string): Membership => {
    // Helper to build a map of City Name -> City ID from the venues page
    const _getCityMap = (html: string): Map<string, number> => {
      const $venues = cheerio.load(html)
      const cityMap = new Map<string, number>()
      $venues('select#city_id option').each((_, cityOption) => {
        const cityName = $venues(cityOption).text().trim()
        const cityId = Number($venues(cityOption).val())
        if (cityName && cityId) {
          cityMap.set(cityName, cityId)
        }
      })
      return cityMap
    }

    const cityIdMap = _getCityMap(venuesHtml)
    const $ = cheerio.load(membershipHtml)
    const cleanText = (el: cheerio.Cheerio<AnyNode>) => el.text().trim().replace(/\s\s+/g, ' ')

    const infoMap = new Map<string, string>()
    $('.smm-membership-info .row').each((_, row) => {
      const key = cleanText($(row).find('p').first()).replace(':', '')
      const value = cleanText($(row).find('p').last())
      if (key && value) infoMap.set(key, value)
    })

    const overviewMap = new Map<string, cheerio.Cheerio<AnyNode>>()
    $('.form-overview ul > li').each((_, li) => {
      const key = cleanText($(li).find('b')).replace(':', '')
      overviewMap.set(key, $(li).find('p'))
    })

    const homeRegionName = infoMap.get(GERMAN_LITERALS.HOME_REGION) ?? ''
    const homeRegionId = cityIdMap.get(homeRegionName)
    if (!homeRegionId) {
      throw new ParsingError(
        `Could not parse or resolve home region ID for city "${homeRegionName}" from membership page.`,
      )
    }

    const profile: Membership['profile'] = {
      name: cleanText($('.smm-membership-info h1')),
      memberId: Number(infoMap.get(GERMAN_LITERALS.MEMBER_ID)),
      memberSince: parseGermanDate(infoMap.get(GERMAN_LITERALS.MEMBER_SINCE)),
      referralCode: infoMap.get(GERMAN_LITERALS.FRIENDS_CODE) ?? '',
      homeRegion: homeRegionName,
      homeRegionId: homeRegionId,
      profilePictureUrl: $('img.smm-customer-avatar').first().attr('src'),
      address: cleanText(overviewMap.get(GERMAN_LITERALS.ADDRESS) ?? $()) || undefined,
      company: cleanText(overviewMap.get(GERMAN_LITERALS.COMPANY) ?? $()) || undefined,
    }

    const statusLabel = cleanText($('.smm-membership-info__state-label').first())
    let status: Membership['plan']['status'] = 'Unknown'
    if (statusLabel === 'Aktiv') status = 'Active'
    if (statusLabel === 'Pausiert') status = 'Paused'

    const plan: Membership['plan'] = {
      name: infoMap.get(GERMAN_LITERALS.MEMBERSHIP) ?? '',
      contractType: infoMap.get(GERMAN_LITERALS.CONTRACT_TYPE) ?? '',
      status,
      monthlyPrice: cleanText(overviewMap.get(GERMAN_LITERALS.CURRENT_PRICE) ?? $()),
    }

    let upcomingChange: Membership['upcomingChange'] | undefined
    const upcomingChangeNode = overviewMap.get(GERMAN_LITERALS.UPCOMING_CHANGE)
    if (upcomingChangeNode) {
      const lines =
        upcomingChangeNode
          .html()
          ?.split('<br>')
          .map((line) => cleanText($(`<div>${line}</div>`))) ?? []
      if (lines.length >= 3) {
        upcomingChange = {
          newPlanName: lines[0] ?? '',
          startsOn: parseGermanDate(lines[1]),
          newPrice: lines[2] ?? '',
          newContractType: (lines[3]?.match(/Vertragsart:\s*(.*)/i)?.[1] ?? '').trim(),
        }
      }
    }

    const statistics: Membership['statistics'] = {
      totalCheckIns: Number(cleanText($('.smm-checkin-stats__total'))),
      checkInsByCategory: $('.smm-checkin-stats__scroll-box .row')
        .map((_, row) => ({
          count: Number(cleanText($(row).find('.smm-checkin-stats__hint'))),
          category: cleanText($(row).find('.smm-checkin-stats__text')),
        }))
        .get(),
    }

    return { profile, plan, upcomingChange, statistics }
  }

  const _parseBookingSnippet = (el: cheerio.Cheerio<AnyNode>, currentDate: Date): Booking => {
    const statusText = el.find('.smm-booking-state-label').text().trim()
    let status: BookingStatus = 'Unknown'
    if (statusText === GERMAN_LITERALS.STATUS_BOOKED) status = 'Booked'
    if (statusText === GERMAN_LITERALS.STATUS_SCHEDULED) status = 'Scheduled'
    if (statusText === GERMAN_LITERALS.STATUS_CHECKED_IN) status = 'CheckedIn'
    if (statusText === GERMAN_LITERALS.STATUS_CANCELLED) status = 'Cancelled'
    if (statusText === GERMAN_LITERALS.STATUS_MISSED) status = 'Missed'

    const timeText = el.find('.smm-class-snippet__class-time').text().replace(/\s+/g, '')
    const [startTime, endTime] = timeText.split('—')

    const venueLink = el.find('.address a.smm-studio-link')
    const venueSlug = (venueLink.attr('href') ?? '').split('/').pop() ?? ''

    return {
      id: Number(el.attr('data-appointment-id')),
      title: el.find('.title a.smm-class-link').text().trim(),
      category: el.find('.title p').text().trim(),
      status,
      date: currentDate,
      startTime,
      endTime,
      venue: {
        id: Number(el.attr('data-address-id')),
        slug: venueSlug,
        name: venueLink.text().trim(),
        district: el.find('.address .district').text().trim(),
      },
      imageUrl: (el.find('.smm-class-snippet__image').attr('style') ?? '').match(/url\('?(.*?)'?\)/)?.[1] ?? '',
    }
  }

  const _parseBookingsPage = (html: string, state?: { year: number; month: number }): Booking[] => {
    const $ = cheerio.load(html)
    const bookings: Booking[] = []
    let currentDate = new Date()

    $('.timetable > div').each((_, element) => {
      const el = $(element)
      if (el.hasClass('table-date')) {
        const [_, day, monthName] = el.text().trim().split(' ')
        const monthIndex = GERMAN_MONTHS[monthName]
        if (day && monthIndex !== undefined) {
          if (state && state.month !== -1 && monthIndex > state.month) {
            state.year--
          }
          currentDate = new Date(
            Date.UTC(state?.year ?? new Date().getFullYear(), monthIndex, Number(day.replace('.', ''))),
          )
          if (state) state.month = monthIndex
        }
        return
      }
      if (el.hasClass('smm-class-snippet')) {
        bookings.push(_parseBookingSnippet(el, currentDate))
      }
    })
    return bookings
  }

  return {
    async getMembership(): Promise<Membership> {
      const [membershipResponse, venuesResponse] = await Promise.all([
        http.get('/profile/membership', true),
        http.get('/venues'),
      ])

      const [membershipHtml, venuesHtml] = await Promise.all([membershipResponse.text(), venuesResponse.text()])

      return _parseMembershipPage(membershipHtml, venuesHtml)
    },

    async getUpcomingBookings(): Promise<Booking[]> {
      const response = await http.get('/profile/schedule', true)
      const html = await response.text()
      return _parseBookingsPage(html)
    },

    async getPastBookings(page = 1): Promise<{ bookings: Booking[]; hasMore: boolean }> {
      const response = await http.get(`/profile/check-ins?page=${page}`, true)
      const json = (await response.json()) as HtmlFragmentApiResponse

      if (!json.success || typeof json.data.content !== 'string') {
        throw new ParsingError('Invalid response format for past bookings.')
      }

      // Past bookings need state to correctly determine the year when paginating
      const state = { year: new Date().getFullYear(), month: -1 }
      const bookings = _parseBookingsPage(json.data.content, state)

      return { bookings, hasMore: json.data.showMore }
    },
  }
}
