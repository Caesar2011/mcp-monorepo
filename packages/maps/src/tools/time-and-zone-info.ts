import { registerTool } from '@mcp-monorepo/shared'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { geospatial } from '../lib/api-client.js'
import { coordinatesSchema } from '../lib/schemas.js'

export const registerTimeAndZoneInfoTool = (server: McpServer) =>
  registerTool(server, {
    name: 'time-and-zone-info',
    title: 'Get Time and Timezone',
    description:
      'Get the current time and timezone info for a specific geographic coordinate (latitude/longitude). Note: This API call costs 5 credits per request. Responses are deterministic for the same inputs. Agents should reuse results from previous calls and avoid redundant requests to minimize costs.',
    isReadOnly: true,
    inputSchema: {
      ...coordinatesSchema.shape,
    },
    outputSchema: {
      timezoneId: z.string().describe('The IANA timezone identifier, e.g., "America/Los_Angeles".'),
      baseUtcOffset: z.number().describe('The standard UTC offset in seconds.'),
      dstOffset: z.number().describe('The Daylight Saving Time offset in seconds, if currently in effect.'),
      rfc2822Timestamp: z.string().describe('The current local time in RFC 2822 format.'),
    },
    async fetcher({ lat, lon }) {
      // The Stadia SDK expects 'lng' for longitude.
      return geospatial.tzLookup({ lat, lng: lon })
    },
    formatter(res) {
      return {
        timezoneId: res.tzId,
        baseUtcOffset: res.baseUtcOffset,
        dstOffset: res.dstOffset,
        rfc2822Timestamp: res.localRfc2822Timestamp,
      }
    },
  })
