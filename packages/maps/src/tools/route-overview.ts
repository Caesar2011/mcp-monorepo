import { registerTool } from '@mcp-monorepo/shared'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type RouteResponse, type RouteRequest } from '@stadiamaps/api'
import { z } from 'zod'

import { route as routeClient } from '../lib/api-client.js'
import { coordinatesSchema, costingSchema, unitsSchema } from '../lib/schemas.js'

export const registerRouteOverviewTool = (server: McpServer) =>
  registerTool(server, {
    name: 'route-overview',
    title: 'Get Route Overview',
    description:
      'Get high-level routing information between two or more locations, including travel time, distance, and an encoded polyline. Note: This API call costs 20 credits per request. Responses are deterministic for the same inputs. Agents should reuse results from previous calls and avoid redundant requests to minimize costs.',
    isReadOnly: true,
    inputSchema: {
      locations: z.array(coordinatesSchema).min(2, 'At least two locations are required for routing.'),
      costing: costingSchema,
      units: unitsSchema,
    },
    outputSchema: {
      found: z.boolean().describe('Whether a route was successfully found.'),
      distance: z.number().optional().describe('The total distance of the route.'),
      distanceUnits: z.string().optional().describe('The units for the distance (e.g., "km", "mi").'),
      time: z.number().optional().describe('The estimated travel time in seconds.'),
      boundingBox: z
        .array(z.number())
        .optional()
        .describe('The bounding box of the route as [minLon, minLat, maxLon, maxLat].'),
      polyline6: z.string().optional().describe('The encoded polyline (precision 6) of the route geometry.'),
    },
    async fetcher({ locations, costing, units }) {
      const req: RouteRequest = {
        locations,
        costing,
        units,
        directionsType: 'none',
        format: 'json',
      }
      return (await routeClient.route({ routeRequest: req })) as RouteResponse
    },
    formatter(res) {
      if (res.trip?.status !== 0) {
        return { found: false }
      }

      const trip = res.trip
      const summary = trip.summary

      return {
        found: true,
        distance: summary.length,
        distanceUnits: trip.units,
        time: summary.time,
        boundingBox: [summary.minLon, summary.minLat, summary.maxLon, summary.maxLat],
        polyline6: trip.legs[0]?.shape,
      }
    },
  })
