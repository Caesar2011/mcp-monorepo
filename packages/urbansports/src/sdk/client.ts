import { createAccountApi, type AccountAPI } from './api/account.api.js'
import { createActivitiesApi, type ActivitiesAPI } from './api/activities.api.js'
import { createBookingApi, type BookingAPI } from './api/booking.api.js'
import { createMetaApi, type MetaAPI } from './api/meta.api.js'
import { createVenuesApi, type VenuesAPI } from './api/venues.api.js'
import { InternalHttpClient, type HttpClientOptions } from './internal/http-client.js'

/**
 * The main client for interacting with the Urban Sports Club API.
 */
export class UrbanSportsClient {
  /** Access account-related data like membership and bookings. Requires authentication. */
  public readonly account: AccountAPI
  /** Access metadata like countries, cities, and categories. */
  public readonly meta: MetaAPI
  /** Search for venues (partner studios). */
  public readonly venues: VenuesAPI
  /** Search for activities (classes and free training). */
  public readonly activities: ActivitiesAPI
  /** Book or cancel classes. Requires authentication. */
  public readonly booking: BookingAPI

  private readonly internalHttpClient: InternalHttpClient

  /**
   * Creates a new instance of the UrbanSportsClient.
   * @param options - Configuration for the client, including optional credentials and language.
   */
  constructor(options: HttpClientOptions = {}) {
    this.internalHttpClient = new InternalHttpClient(options)

    // Create and attach the functional API modules
    this.account = createAccountApi(this.internalHttpClient)
    this.meta = createMetaApi(this.internalHttpClient)
    this.venues = createVenuesApi(this.internalHttpClient)
    this.activities = createActivitiesApi(this.internalHttpClient)
    this.booking = createBookingApi(this.internalHttpClient)
  }

  /**
   * Manually triggers the authentication process.
   * This is useful to confirm credentials upon client initialization.
   * Most methods will call this automatically if required.
   */
  public async login(): Promise<void> {
    await this.internalHttpClient.authenticate()
  }
}
