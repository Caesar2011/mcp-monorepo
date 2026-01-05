import { UrbanSportsError } from '../internal/errors.js'
import { type BookingActionResult } from '../types/public.types.js'

import type { InternalHttpClient } from '../internal/http-client.js'

export type BookingAPI = ReturnType<typeof createBookingApi>

type BookingSuccessResponse = {
  success: true
  data: { id: number; state: string; alert: string; freeSpots?: { current: number; maximum: number } }
}

type BookingFailureResponse = {
  success: false
  data: { state: string; alert: string; id?: never; freeSpots?: never }
}

type BookingActionApiResponse = BookingSuccessResponse | BookingFailureResponse

/**
 * Type guard to check if the JSON response for a booking action is a valid success or failure response.
 */
function isBookingActionResponse(obj: unknown): obj is BookingActionApiResponse {
  if (typeof obj !== 'object' || !obj) return false
  const res = obj as { success?: boolean; data?: unknown }
  if (typeof res.success !== 'boolean' || typeof res.data !== 'object' || !res.data) {
    return false
  }

  const data = res.data as { state?: string; alert?: string }
  return typeof data.state === 'string' && typeof data.alert === 'string'
}

/**
 * Creates an API object for booking and canceling classes.
 * All methods require authentication.
 * @param http The internal HTTP client.
 * @internal
 */
export function createBookingApi(http: InternalHttpClient) {
  const _performAction = async (action: 'book' | 'cancel', classId: number): Promise<BookingActionResult> => {
    const response = await http.post(`/search/${action}/${classId}`, new URLSearchParams(), true)
    const json = await response.json()

    if (!isBookingActionResponse(json)) {
      throw new UrbanSportsError(`Received an invalid JSON response while trying to ${action} class ${classId}.`)
    }

    return {
      success: json.success,
      // Use the ID from the response if available, otherwise use the ID passed to the function.
      activityId: json.success ? json.data.id : classId,
      newState: json.data.state,
      message: json.data.alert,
      freeSpots: json.success ? json.data.freeSpots : undefined,
    }
  }

  return {
    /**
     * Books a specific class for the authenticated user.
     * @param classId The numeric ID of the class to book.
     * @returns A promise that resolves to a `BookingActionResult` indicating the outcome.
     */
    async book(classId: number): Promise<BookingActionResult> {
      return _performAction('book', classId)
    },

    /**
     * Cancels a previously booked class for the authenticated user.
     * @param classId The numeric ID of the class to cancel.
     * @returns A promise that resolves to a `BookingActionResult` indicating the outcome.
     */
    async cancel(classId: number): Promise<BookingActionResult> {
      return _performAction('cancel', classId)
    },
  }
}
