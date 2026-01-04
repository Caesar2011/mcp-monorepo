import { registerTool } from '@mcp-monorepo/shared'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type BulkRequest, BulkRequestEndpointEnum } from '@stadiamaps/api'
import { z } from 'zod'

import { geocode as geocodeClient } from '../lib/api-client.js'
import { geocodingCommonInputSchema, unstructuredQuerySchema } from '../lib/schemas.js'

const bulkGeocodeItemSchema = z.object({
  query: unstructuredQuerySchema,
  ...geocodingCommonInputSchema,
})

export const registerBulkGeocodeTool = (server: McpServer) =>
  registerTool(server, {
    name: 'bulk-geocode',
    title: 'Bulk Geocode Addresses',
    description:
      'Perform multiple address geocoding operations in a single request. Best for addresses, not POIs. Note: This API call costs 20 credits per request. Responses are deterministic for the same inputs. Agents should reuse results from previous calls and avoid redundant requests to minimize costs.',
    isReadOnly: true,
    inputSchema: {
      items: z
        .array(bulkGeocodeItemSchema)
        .min(1, 'At least one item is required for bulk geocoding.')
        .describe('Array of geocoding items to process.'),
    },
    outputSchema: {
      results: z
        .array(
          z.object({
            label: z.string().optional(),
            coordinates: z.array(z.number()),
            matchType: z.string().optional(),
            boundingBox: z.array(z.number()).optional(),
          }),
        )
        .describe('An array of the best matching result for each successful input query.'),
      metadata: z.object({
        totalRequests: z.number(),
        successfulRequests: z.number(),
        failedRequests: z.number(),
      }),
    },
    async fetcher({ items }) {
      const bulkRequests: BulkRequest[] = items.map((item) => ({
        endpoint: BulkRequestEndpointEnum.V1Search,
        query: {
          text: item.query,
          focusPointLat: item.focusPoint?.lat,
          focusPointLon: item.focusPoint?.lon,
          boundaryCountry: item.countryFilter,
          lang: item.lang,
          layers: item.layer ? [item.layer] : undefined,
        },
      }))

      return geocodeClient.searchBulk({ bulkRequest: bulkRequests })
    },
    formatter(responses) {
      const successfulResults = responses
        .filter((res) => res.status === 200 && res.response?.features?.length)
        .flatMap(
          (res) =>
            res.response?.features.slice(0, 1).map((feature) => ({
              label: feature.properties?.label,
              coordinates: feature.geometry.coordinates,
              matchType: feature.properties?.matchType,
              boundingBox: feature.bbox,
            })) ?? [],
        )

      const failedCount = responses.filter((res) => res.status !== 200 || !res.response?.features?.length).length

      return {
        results: successfulResults,
        metadata: {
          totalRequests: responses.length,
          successfulRequests: successfulResults.length,
          failedRequests: failedCount,
        },
      }
    },
  })
