import { registerTool } from '@mcp-monorepo/shared'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { generateStaticMap } from '../lib/api-client.js'
import { staticMapInputSchema } from '../lib/schemas.js'

type StaticMapLine = {
  shape: string
  stroke_color?: string
  stroke_width?: number
}

type StaticMapMarker = {
  lat: number
  lon: number
  label?: string
  color?: string
  style?: string // e.g., 'custom:URL'
}

type StaticMapPayload = {
  size: string
  lines: StaticMapLine[]
  markers?: StaticMapMarker[]
}

export const registerStaticMapTool = (server: McpServer) =>
  registerTool(server, {
    name: 'static-map',
    title: 'Generate Static Map Image',
    description:
      'Generate a PNG map image of an area, optionally including markers and a line (e.g., to draw a route or a boundary). Note: This API call costs 20 credits per request. Responses are deterministic for the same inputs. Agents should reuse results from previous calls and avoid redundant requests to minimize costs.',
    isReadOnly: true,
    inputSchema: staticMapInputSchema,
    outputSchema: {
      imageData: z.string().describe('The base64-encoded string of the PNG image.'),
      mimeType: z.literal('image/png'),
    },
    async fetcher({ style, size, encodedPolyline, strokeColor, strokeWidth, markers }) {
      const payload: StaticMapPayload = {
        size,
        lines: [],
      }

      if (encodedPolyline) {
        const line: StaticMapLine = { shape: encodedPolyline }
        if (strokeColor) line.stroke_color = strokeColor
        if (strokeWidth) line.stroke_width = strokeWidth
        payload.lines.push(line)
      }

      if (markers && markers.length > 0) {
        payload.markers = markers.map(({ lat, lon, label, color, markerUrl }) => {
          const marker: StaticMapMarker = { lat, lon }
          if (label) marker.label = label
          if (color) marker.color = color
          if (markerUrl) marker.style = `custom:${markerUrl}`
          return marker
        })
      }

      if (!payload.lines.length && !payload.markers?.length) {
        throw new Error(
          'A static map requires at least one marker or a polyline to be specified to determine the map viewport.',
        )
      }

      const imageBuffer = await generateStaticMap(style, payload)
      return Buffer.from(imageBuffer).toString('base64')
    },
    formatter(base64Image) {
      return {
        imageData: base64Image,
        mimeType: 'image/png' as const,
      }
    },
  })
