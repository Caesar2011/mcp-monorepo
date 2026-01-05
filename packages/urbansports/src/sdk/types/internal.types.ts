/**
 * Describes the common JSON response structure for AJAX requests that return HTML content.
 */
export interface HtmlFragmentApiResponse {
  success: boolean
  data: {
    showMore: boolean
    content: string
    [key: string]: unknown
  }
}

/**
 * Describes the raw venue object as returned by the `studios-map` JSON API.
 */
export interface RawVenue {
  id: number
  name: string
  slug: string
  addressId: number
  address: string
  district: string
  location: { lat: number; lng: number }
  featured: boolean
  categories: unknown[] // Further validation is needed in parser
  studioCovers: { cover150: string; cover1024: string }[]
  [key: string]: unknown
}

/**
 * Describes the JSON response structure from the `studios-map` API.
 */
export interface VenuesApiResponse {
  success: boolean
  data: {
    venues: RawVenue[]
  }
}

/**
 * Maps plan names to their corresponding API `plan_type` ID.
 */
export const PLAN_TYPE_MAP = {
  s: 1,
  m: 2,
  l: 3,
  xl: 6,
} as const

/**
 * Defines German month names for date parsing.
 */
export const GERMAN_MONTHS: { [key: string]: number } = {
  Januar: 0,
  Februar: 1,
  März: 2,
  April: 3,
  Mai: 4,
  Juni: 5,
  Juli: 6,
  August: 7,
  September: 8,
  Oktober: 9,
  November: 10,
  Dezember: 11,
}

/**
 * Defines the keys for German text literals found in the HTML, used for parsing.
 * NOTE: These are hardcoded for German ('de'). If a different language is used in the
 * client options, parsing based on these literals will fail.
 */
export const GERMAN_LITERALS = {
  MEMBER_ID: 'Nummer',
  MEMBER_SINCE: 'Mitglied seit',
  FRIENDS_CODE: 'Freunde-Code',
  HOME_REGION: 'Urban Sports Club-Region',
  MEMBERSHIP: 'Mitgliedschaft',
  CONTRACT_TYPE: 'Vertragsart',
  CURRENT_PRICE: 'Aktueller Preis pro Monat',
  UPCOMING_CHANGE: 'Änderung der Mitgliedsplan beantragt',
  ADDRESS: 'Adresse',
  COMPANY: 'Firma',
  STATUS_BOOKED: 'Gebucht',
  STATUS_SCHEDULED: 'Vorgemerkt',
  STATUS_CHECKED_IN: 'Eingecheckt',
  STATUS_CANCELLED: 'Storniert',
  STATUS_MISSED: 'Verpasst',
} as const
