import { ThrottledExecutor, logger } from '@mcp-monorepo/shared'
import { Configuration, GeocodingApi, GeospatialApi, RoutingApi } from '@stadiamaps/api'

import { getStadiaApiKey } from './config.js'

// A single throttled executor for all Stadia Maps API calls.
// The free tier has a limit of 5 requests/second. Setting a 250ms delay (4 req/s) is a safe buffer.
const executor = new ThrottledExecutor(250)

let geocodingApi: GeocodingApi
let routingApi: RoutingApi
let geospatialApi: GeospatialApi

/**
 * Initializes the Stadia Maps API clients.
 * This function should be called after the API key is validated.
 */
export function initializeApiClients(): void {
  const apiKey = getStadiaApiKey()
  const apiConfig = new Configuration({ apiKey })

  // The Stadia SDK uses fetch internally. We can wrap the API methods
  // with our throttled executor.
  geocodingApi = new GeocodingApi(apiConfig)
  routingApi = new RoutingApi(apiConfig)
  geospatialApi = new GeospatialApi(apiConfig)

  logger.info('Stadia Maps API clients initialized.')
}

// Export wrapped, throttled versions of the API methods we will use.
// This ensures all calls throughout the application are rate-limited.

export const geocode = {
  search: (params: Parameters<GeocodingApi['searchV2']>[0]) => executor.execute(() => geocodingApi.searchV2(params)),
  searchBulk: (params: Parameters<GeocodingApi['searchBulk']>[0]) =>
    executor.execute(() => geocodingApi.searchBulk(params)),
}

export const route = {
  route: (params: Parameters<RoutingApi['route']>[0]) => executor.execute(() => routingApi.route(params)),
  isochrone: (params: Parameters<RoutingApi['isochrone']>[0]) => executor.execute(() => routingApi.isochrone(params)),
}

export const geospatial = {
  tzLookup: (params: Parameters<GeospatialApi['tzLookup']>[0]) =>
    executor.execute(() => geospatialApi.tzLookup(params)),
}

// Special case for static maps, which uses a direct fetch call.
// The base URL for the Static Maps API.
const STATIC_MAPS_BASE_URL = 'https://tiles.stadiamaps.com/static_cacheable'

export async function generateStaticMap(style: string, payload: Record<string, unknown>): Promise<ArrayBuffer> {
  const url = `${STATIC_MAPS_BASE_URL}/${style}?api_key=${getStadiaApiKey()}`

  const response = await executor.execute(() =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }),
  )

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Static map generation failed with HTTP ${response.status}: ${errorBody}`)
  }

  return response.arrayBuffer()
}
