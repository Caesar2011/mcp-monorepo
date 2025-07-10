// MCP handler tests for geocoding tool
import { describe, it, expect, vi, beforeEach } from 'vitest'

import * as formatter from './formatter.js'
import { geocodingHandler } from './handler.js'
import * as helper from './helper.js'

import type { GeocodingApiResponse } from './types.js'

describe('geocodingHandler', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns error if name is empty', async () => {
    const result = await geocodingHandler({ name: '' })
    expect(result.content[0]?.text).toMatch(/cannot be empty/i)
  })

  it('returns formatted result on success', async () => {
    vi.spyOn(helper, 'fetchGeocodingData').mockResolvedValue({ results: [] } as GeocodingApiResponse)
    vi.spyOn(helper, 'processGeocodingData').mockReturnValue({
      results: [
        {
          id: 1,
          name: 'A',
          latitude: 1,
          longitude: 2,
          elevation: 3,
          country_code: 'X',
          timezone: 'Y',
          country: 'Z',
          admin: [],
        },
      ],
    })
    vi.spyOn(formatter, 'formatGeocodingData').mockReturnValue('formatted!')
    const result = await geocodingHandler({ name: 'A' })
    expect(result.content[0]?.text).toBe('formatted!')
  })

  it('returns formatted error for fetch error', async () => {
    vi.spyOn(helper, 'fetchGeocodingData').mockRejectedValue(new Error('fail-net'))
    vi.spyOn(formatter, 'formatGeocodingError').mockReturnValue('err!')
    const result = await geocodingHandler({ name: 'failcase' })
    expect(result.content[0]?.text).toBe('err!')
    expect(result.content[0]?._meta?.stderr).toBe('fail-net')
  })

  it('returns formatted error for non-Error thrown', async () => {
    vi.spyOn(helper, 'fetchGeocodingData').mockRejectedValue('unknownfail')
    vi.spyOn(formatter, 'formatGeocodingError').mockReturnValue('errz!')
    const result = await geocodingHandler({ name: 'failcase2' })
    expect(result.content[0]?.text).toBe('errz!')
    expect(result.content[0]?._meta?.stderr).toBe('unknownfail')
  })
})
