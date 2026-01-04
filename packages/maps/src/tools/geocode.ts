import { registerTool } from '@mcp-monorepo/shared'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type LayerId } from '@stadiamaps/api'
import { z } from 'zod'

import { geocode as geocodeClient } from '../lib/api-client.js'
import { geocodingCommonInputSchema, unstructuredQuerySchema } from '../lib/schemas.js'

export const registerGeocodeTool = (server: McpServer) =>
  registerTool(server, {
    name: 'geocode',
    title: 'Geocode Address or Place',
    description:
      'Look up a single street address, point of interest (POI), or area. Returns detailed geographic information. Note: This API call costs 20 credits per request. Responses are deterministic for the same inputs. Agents should reuse results from previous calls and avoid redundant requests to minimize costs.',
    isReadOnly: true,
    inputSchema: {
      query: unstructuredQuerySchema,
      ...geocodingCommonInputSchema,
    },
    outputSchema: {
      results: z.array(
        z.object({
          name: z.string().describe('The primary name of the location.'),
          distance: z.number().optional().describe('The distance of that POI/address from the focus point.'),
          layer: z.string().describe('The type of feature, e.g., "address", "poi", "locality".'),
          coordinates: z
            .array(z.number())
            .optional()
            .describe("The [longitude, latitude] of the feature's point geometry."),
          boundingBox: z
            .array(z.number())
            .optional()
            .describe('The bounding box as [west, south, east, north], if available.'),
          context: z
            .object({
              countryCode: z
                .string()
                .optional()
                .describe('The ISO 3166-1 alpha-2 country code in which the feature is located.'),
              countryCodeAlpha3: z
                .string()
                .optional()
                .describe('The ISO 3166-1 alpha-3 country code in which the feature is located.'),
            })
            .optional()
            .describe('Additional contextual information like country, region, etc.'),
        }),
      ),
    },
    async fetcher({ query, countryFilter, lang, layer, focusPoint }) {
      return geocodeClient.search({
        text: query,
        boundaryCountry: countryFilter,
        lang,
        layers: layer ? [layer as LayerId] : undefined,
        focusPointLat: focusPoint?.lat,
        focusPointLon: focusPoint?.lon,
      })
    },
    formatter(res) {
      if (!res.features || res.features.length === 0) {
        return { results: [] }
      }

      const results = res.features.map((feature) => {
        const context = feature.properties.context ?? undefined
        return {
          name: feature.properties.name,
          distance: feature.properties.distance ?? undefined,
          layer: feature.properties.layer,
          // GeoJSON is [lon, lat]
          coordinates: feature.geometry?.coordinates ?? undefined,
          // GeoJSON bbox is [west, south, east, north]
          boundingBox: feature.bbox ?? undefined,
          context:
            context?.iso3166A2 || context?.iso3166A3
              ? {
                  ...(context.iso3166A2 ? { countryCode: context.iso3166A2 } : {}),
                  ...(context.iso3166A3 ? { countryCodeAlpha3: context.iso3166A3 } : {}),
                }
              : undefined,
        }
      })
      return { results }
    },
  })
