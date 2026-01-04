import { CostingModel, DistanceUnit, IsochroneCostingModel } from '@stadiamaps/api'
import { z } from 'zod'

// ===================================
// Reusable Primitive Schemas
// ===================================

export const latitudeSchema = z
  .number()
  .min(-90, 'Latitude must be between -90 and 90.')
  .max(90, 'Latitude must be between -90 and 90.')
  .describe('The latitude of the geographic point.')

export const longitudeSchema = z
  .number()
  .min(-180, 'Longitude must be between -180 and 180.')
  .max(180, 'Longitude must be between -180 and 180.')
  .describe('The longitude of the geographic point.')

export const coordinatesSchema = z
  .object({
    lat: latitudeSchema,
    lon: longitudeSchema,
  })
  .describe('A geographic coordinate pair (latitude, longitude).')

// ===================================
// Geocoding Schemas
// ===================================

export const geocodingCommonInputSchema = {
  countryFilter: z
    .array(
      z
        .string()
        .length(3, 'Country codes must be 3-letter ISO 3166-1 alpha-3 codes.')
        .describe('An ISO 3166-1 alpha-3 country code to limit the search to (e.g. "USA", "DEU").'),
    )
    .optional()
    .describe('An array of country codes to filter the search results.'),
  lang: z
    .string()
    .min(2, 'Language tag must be at least 2 characters.')
    .default('en')
    .describe('A BCP-47 language tag to localize the results (e.g. "en", "de").'),
  focusPoint: coordinatesSchema
    .optional()
    .describe('A coordinate pair to focus the search around, improving result relevance. Provide whenever possible.'),
  layer: z
    .enum(['address', 'coarse', 'country', 'region', 'locality'])
    .optional()
    .describe(
      'The layer to search in. `coarse` for areas, `address` for streets, `poi` for points of interest, etc. Defaults to all layers.',
    ),
}

export const unstructuredQuerySchema = z
  .string()
  .describe(
    'The address or place name to search for. For best results with POIs (e.g., "Starbucks"), provide a `focusPoint`.',
  )

// ===================================
// Routing Schemas
// ===================================

export const costingSchema = z.nativeEnum(CostingModel).describe('The method of travel to use for routing.')

export const unitsSchema = z
  .nativeEnum(DistanceUnit)
  .describe('The unit of measurement for distances (kilometers or miles).')

// ===================================
// Isochrone Schemas
// ===================================

export const isochroneCostingSchema = z
  .nativeEnum(IsochroneCostingModel)
  .describe('The method of travel for isochrone calculation.')

const contourSchema = z
  .object({
    time: z
      .number()
      .positive()
      .optional()
      .describe('The time in minutes for the contour. Mutually exclusive with `distance`.'),
    distance: z
      .number()
      .positive()
      .optional()
      .describe('The distance in kilometers for the contour. Mutually exclusive with `time`.'),
  })
  .refine(
    (data) => (data.time !== undefined) !== (data.distance !== undefined),
    'Either `time` or `distance` must be specified for a contour, but not both.',
  )

export const contoursSchema = z
  .array(contourSchema)
  .min(1, 'At least one contour must be provided.')
  .max(4, 'A maximum of 4 contours can be requested.')
  .describe('An array of 1-4 contours, each defined by either time or distance.')
  .refine((contours) => {
    if (contours.length <= 1) return true
    const firstHasTime = contours[0].time !== undefined
    return contours.every((c) => (c.time !== undefined) === firstHasTime)
  }, 'All contours in a single request must be of the same type (either all time-based or all distance-based).')

// ===================================
// Static Map Schemas
// ===================================

export const staticMapInputSchema = {
  style: z
    .enum(['alidade_smooth', 'alidade_smooth_dark', 'outdoors', 'stamen_terrain', 'stamen_toner', 'stamen_watercolor'])
    .default('outdoors')
    .describe('The visual style of the map theme.'),
  size: z
    .string()
    .regex(/^\d+x\d+(@2x)?$/, 'Size must be in format "WIDTHxHEIGHT" or "WIDTHxHEIGHT@2x".')
    .default('600x400')
    .describe(
      'The dimensions of the map image in pixels, e.g., "800x600". Add "@2x" for high-resolution (retina) display.',
    ),
  encodedPolyline: z
    .string()
    .optional()
    .describe('An encoded polyline (precision 6) to draw on the map, typically from a routing result.'),
  strokeColor: z
    .string()
    .optional()
    .describe('Color for the polyline (hex code without "#" or CSS color name, e.g., "FF0000" or "blue").'),
  strokeWidth: z.number().positive().optional().describe('Width of the polyline in pixels.'),
  markers: z
    .array(
      z.object({
        lat: latitudeSchema,
        lon: longitudeSchema,
        label: z
          .string()
          .optional()
          .describe('An optional label for the marker (single character or a supported emoji).'),
        color: z
          .string()
          .optional()
          .describe('Optional color for the marker (hex code without "#" or CSS color name).'),
        markerUrl: z.string().url().optional().describe('URL to a custom marker image.'),
      }),
    )
    .optional()
    .describe('An array of markers to place on the map.'),
}
