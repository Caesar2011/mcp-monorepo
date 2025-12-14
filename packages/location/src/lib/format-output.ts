import { type SchemaTypeOf } from '@mcp-monorepo/shared'
import { z } from 'zod'

import type { IpLocationResponse } from './types.js'

export const OutputSchema = {
  ipAddress: z.string(),
  location: z.string(),
  coordinates: z
    .object({
      lat: z.number(),
      lon: z.number(),
    })
    .optional(),
  timezone: z.string().optional(),
  zip: z.string().optional(),
  isp: z.string().optional(),
  org: z.string().optional(),
}

export function formatter(data: IpLocationResponse): SchemaTypeOf<typeof OutputSchema> {
  const locationParts: string[] = [
    ...(data.city ? [data.city] : []),
    ...(data.regionName ? [data.regionName] : []),
    ...(data.country ? [data.country] : []),
  ]

  return {
    ipAddress: data.query,
    location: locationParts.join(', ') || 'Unknown location',
    ...(data.lat !== undefined &&
      data.lon !== undefined && {
        coordinates: {
          lat: data.lat,
          lon: data.lon,
        },
      }),
    ...(data.timezone && { timezone: data.timezone }),
    ...(data.zip && { zip: data.zip }),
    ...(data.isp && { isp: data.isp }),
    ...(data.org && data.org !== data.isp && { org: data.org }),
  }
}
