import { registerTool } from '@mcp-monorepo/shared'
import { z } from 'zod'

import type { GeocodingApiResponse } from './geocoding.types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const registerGeocodingTool = (server: McpServer) =>
  registerTool(server, {
    name: 'geocoding',
    title: 'Get Location Coordinates',
    description:
      'Finds the latitude and longitude for a named place (city, town, or landmark) via Open-Meteo geocoding API. Returns results for ambiguous names.',
    inputSchema: {
      name: z.string().min(1, 'Location name required').describe('Name of a city or location'),
    },
    outputSchema: {
      locations: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          latitude: z.number(),
          longitude: z.number(),
          elevation: z.number(),
          country_code: z.string(),
          timezone: z.string(),
          country: z.string(),
          admin: z.array(z.string()),
        }),
      ),
    },
    isReadOnly: true,
    async fetcher({ name }) {
      const trimmedName = name?.trim()
      if (!trimmedName) {
        throw new Error('Location name cannot be empty')
      }

      const encodedName = encodeURIComponent(name)
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodedName}&count=10&language=en&format=json`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return (await response.json()) as GeocodingApiResponse
    },
    formatter(data) {
      const locations =
        data.results?.map((result) => {
          const admin: string[] = []
          if (result.admin1) admin.push(result.admin1)
          if (result.admin2) admin.push(result.admin2)
          if (result.admin3) admin.push(result.admin3)
          if (result.admin4) admin.push(result.admin4)
          return {
            id: result.id,
            name: result.name,
            latitude: result.latitude,
            longitude: result.longitude,
            elevation: result.elevation,
            country_code: result.country_code,
            timezone: result.timezone,
            country: result.country,
            admin,
          }
        }) ?? []
      return { locations }
    },
  })
