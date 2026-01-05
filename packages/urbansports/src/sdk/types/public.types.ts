/**
 * Represents a geographical country containing multiple cities.
 */
export interface Country {
  name: string
  cities: City[]
}

/**
 * Represents a city within a country.
 */
export interface City {
  id: number
  name: string
}

/**
 * Represents a primary district within a city, which can contain sub-districts.
 */
export interface District {
  id: number
  name: string
  subDistricts: SubDistrict[]
}

/**
 * Represents a sub-district within a primary district.
 */
export interface SubDistrict {
  id: number
  name: string
}

/**
 * Represents a sports category.
 */
export interface Category {
  id: number
  name: string
}

/**
 * Represents a detailed sports category, as associated with a Venue.
 */
export interface VenueCategory {
  id: number
  name: string
  key: string
  isTopCategory: boolean
}

/**
 * Represents a sports venue (partner studio).
 */
export interface Venue {
  id: number
  slug: string
  name: string
  address: {
    full: string
    district: string
    coordinates: {
      lat: number
      lon: number
    }
  }
  isFeatured: boolean
  categories: VenueCategory[]
  coverImages: {
    thumbnail: string
    large: string
  }
  distanceInKm?: number
}

/**
 * Parameters for searching for venues.
 */
export interface VenueSearchParams {
  cityId: number
  plan?: 's' | 'm' | 'l' | 'xl'
  /** Free-text search term for the venue name. */
  query?: string
  categoryIds?: number[]
  districtIds?: number[]
  /** Latitude for distance-based sorting and calculation. */
  userLat?: number
  /** Longitude for distance-based sorting and calculation. */
  userLon?: number
}

/**
 * Defines the type of an activity (e.g., live stream or on-site).
 */
export type ActivityType = 'live' | 'onsite'

/**
 * Represents a searchable activity or class from a search list.
 */
export interface Activity {
  id: string
  name: string
  category?: string
  venueSlug: string
  venueName: string
  district: string
  startTime?: string
  endTime?: string
  type: ActivityType
}

/**
 * Represents the detailed information for a single activity/class.
 */
export interface ActivityDetails {
  id: string
  name: string
  date: Date
  startTime: string
  endTime: string
  imageUrl: string
  description?: string
  instructor?: string
  bookingStatus: BookingStatus
  rating?: {
    score: number
    count: number
  }
  venue: {
    name: string
    address: string
    disciplines: string[]
  }
  hints: {
    visitLimits?: string
    general?: string
    cancellation?: string
  }
  applicablePlans: string[]
  map?: {
    staticMaps: {
      width: number
      url: string
    }[]
  }
}

/**
 * Parameters for searching for activities.
 */
export interface ActivitySearchParams {
  /** The city to search in. This parameter is required. */
  cityId?: number
  /** The specific date for the activity search. */
  date: Date
  /** Filter by service type. 0 for classes, 1 for free training. Defaults to 0 (classes). */
  serviceType?: 0 | 1
  plan?: 's' | 'm' | 'l' | 'xl'
  types?: ActivityType[]
  page?: number
}

/**
 * Represents the status of a user's booking.
 */
export type BookingStatus = 'Booked' | 'Scheduled' | 'CheckedIn' | 'Cancelled' | 'Missed' | 'Unknown'

/**
 * Represents the result of a booking or cancellation action.
 */
export interface BookingActionResult {
  success: boolean
  activityId: number
  newState: string
  message: string
  freeSpots?: {
    current: number
    maximum: number
  }
}

/**
 * Represents a user's past, present, or future booking.
 */
export interface Booking {
  id: number
  title: string
  category: string
  status: BookingStatus
  date: Date
  startTime?: string
  endTime?: string
  venue: {
    id: number
    slug: string
    name: string
    district: string
  }
  imageUrl: string
}

/**
 * Represents a user's membership details.
 */
export interface Membership {
  profile: {
    memberId: number
    name: string
    memberSince: Date
    referralCode: string
    homeRegion: string
    homeRegionId: number // Important for implicit searches
    profilePictureUrl?: string
    address?: string
    company?: string
  }
  plan: {
    name: string
    status: 'Active' | 'Paused' | 'Inactive' | 'Unknown'
    contractType: string
    monthlyPrice: string
  }
  upcomingChange?: {
    newPlanName: string
    startsOn: Date
    newPrice: string
    newContractType: string
  }
  statistics: {
    totalCheckIns: number
    checkInsByCategory: {
      category: string
      count: number
    }[]
  }
}
