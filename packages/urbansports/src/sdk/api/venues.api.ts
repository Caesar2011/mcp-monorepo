import { ParsingError } from '../internal/errors.js'
import { type VenuesApiResponse, type RawVenue, PLAN_TYPE_MAP } from '../types/internal.types.js'
import { type Venue, type VenueSearchParams, type VenueCategory } from '../types/public.types.js'

import type { InternalHttpClient } from '../internal/http-client.js'

export type VenuesAPI = ReturnType<typeof createVenuesApi>

interface RawVenueCategory {
  id: number
  name: string
  key: string
  is_top_category: boolean
}

function isRawVenueCategory(cat: unknown): cat is RawVenueCategory {
  if (typeof cat !== 'object' || !cat) return false
  const obj = cat as RawVenueCategory
  return (
    typeof obj.id === 'number' &&
    typeof obj.name === 'string' &&
    typeof obj.key === 'string' &&
    typeof obj.is_top_category === 'boolean'
  )
}

/**
 * Calculates the approximate distance between two geo-coordinates in kilometers
 * using the Haversine formula.
 */
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Creates an API object for fetching venue data.
 * @param http The internal HTTP client.
 * @internal
 */
export function createVenuesApi(http: InternalHttpClient) {
  /**
   * Normalizes a raw venue object from the API into a clean `Venue` object.
   */
  const _normalizeVenue = (raw: RawVenue, userLat?: number, userLon?: number): Venue => {
    const venue: Venue = {
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      isFeatured: raw.featured,
      address: {
        full: raw.address,
        district: raw.district,
        coordinates: {
          lat: raw.location.lat,
          lon: raw.location.lng,
        },
      },
      categories: (raw.categories ?? []).filter(isRawVenueCategory).map(
        (cat): VenueCategory => ({
          id: cat.id,
          name: cat.name,
          key: cat.key,
          isTopCategory: cat.is_top_category,
        }),
      ),
      coverImages: {
        thumbnail: raw.studioCovers[0]?.cover150 ?? '',
        large: raw.studioCovers[0]?.cover1024 ?? '',
      },
    }

    if (userLat !== undefined && userLon !== undefined) {
      venue.distanceInKm = getDistanceInKm(
        userLat,
        userLon,
        venue.address.coordinates.lat,
        venue.address.coordinates.lon,
      )
    }
    return venue
  }

  return {
    /**
     * Searches for venues based on various criteria.
     * This method does not require authentication.
     * @param params The search parameters.
     * @returns A promise that resolves to an array of `Venue` objects.
     */
    async search(params: VenueSearchParams): Promise<Venue[]> {
      const search = new URLSearchParams()
      search.append('city', params.cityId.toString())
      search.append('business_type[]', 'b2c') // Standard for public search

      if (params.plan) {
        search.append('plan_type', PLAN_TYPE_MAP[params.plan].toString())
      }
      params.categoryIds?.forEach((id) => search.append('category[]', id.toString()))
      params.districtIds?.forEach((id) => search.append('district[]', id.toString()))

      // eslint-disable-next-line use-logger-not-console/replace-console-with-logger
      console.log(`/studios-map?${search.toString()}`)
      const response = await http.get(`/studios-map?${search.toString()}`)
      const json = (await response.json()) as unknown

      const isApiResponse = (obj: unknown): obj is VenuesApiResponse =>
        typeof obj === 'object' &&
        !!obj &&
        'success' in obj &&
        'data' in obj &&
        typeof obj.data === 'object' &&
        !!obj.data &&
        'venues' in obj.data &&
        Array.isArray(obj.data.venues)

      if (!isApiResponse(json) || !json.success) {
        throw new ParsingError('Invalid response format from venues API.')
      }

      let venues = json.data.venues.map((v) => _normalizeVenue(v, params.userLat, params.userLon))

      // API does not support free-text search, so we filter locally.
      if (params.query) {
        const searchTerm = params.query.toLowerCase()
        venues = venues.filter((v) => v.name.toLowerCase().includes(searchTerm))
      }

      // If user location is provided, sort by distance.
      if (params.userLat !== undefined && params.userLon !== undefined) {
        venues.sort((a, b) => (a.distanceInKm ?? Infinity) - (b.distanceInKm ?? Infinity))
      }

      return venues
    },
  }
}
