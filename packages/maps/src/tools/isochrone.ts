import { registerTool } from '@mcp-monorepo/shared'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type IsochroneRequest } from '@stadiamaps/api'
import { z } from 'zod'

import { route as routeClient } from '../lib/api-client.js'
import { coordinatesSchema, contoursSchema, isochroneCostingSchema } from '../lib/schemas.js'

export const registerIsochroneTool = (server: McpServer) =>
  registerTool(server, {
    name: 'isochrone',
    title: 'Generate Isochrone Contours',
    description:
      'Generate polygons (isochrones) showing areas reachable within specified time or distance constraints from a single location. Note: This API call costs 20 credits per request. Responses are deterministic for the same inputs. Agents should reuse results from previous calls and avoid redundant requests to minimize costs.',
    isReadOnly: true,
    inputSchema: {
      location: coordinatesSchema,
      costing: isochroneCostingSchema,
      contours: contoursSchema,
    },
    outputSchema: {
      // The direct GeoJSON FeatureCollection is a well-understood, structured format.
      geoJson: z
        .record(z.string(), z.unknown())
        .describe('A GeoJSON FeatureCollection representing the isochrone polygons.'),
    },
    async fetcher({ location, costing, contours }) {
      const request: IsochroneRequest = {
        locations: [location],
        costing,
        contours,
      }
      return routeClient.isochrone({ isochroneRequest: request })
    },
    formatter(response) {
      // The response is already a valid GeoJSON FeatureCollection object.
      // We can return it directly. The properties on each feature contain
      // the contour and metric info.
      return { geoJson: response as unknown as Record<string, unknown> }
    },
  })
