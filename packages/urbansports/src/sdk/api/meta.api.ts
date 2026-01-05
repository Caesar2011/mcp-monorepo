import * as cheerio from 'cheerio'

import type { InternalHttpClient } from '../internal/http-client.js'
import type { Category, City, Country, District } from '../types/public.types.js'

// In-memory cache
let cachedCountries: Country[] | undefined
let cachedCategories: Category[] | undefined
const cachedDistricts = new Map<number, District[]>()

export type MetaAPI = ReturnType<typeof createMetaApi>

/**
 * Creates an API object for fetching metadata like locations and categories.
 * @param http The internal HTTP client.
 * @internal
 */
export function createMetaApi(http: InternalHttpClient) {
  /**
   * Parses the venues page to extract all countries and their primary cities.
   */
  const _parseCountriesAndCities = (html: string): Country[] => {
    const $ = cheerio.load(html)
    const countriesMap = new Map<string, City[]>()

    $('select#city_id optgroup').each((_, countryGroup) => {
      const countryName = $(countryGroup).attr('label')
      if (!countryName) return

      const cities: City[] = []
      $(countryGroup)
        .find('option')
        .each((_, cityOption) => {
          const cityName = $(cityOption).text().trim()
          const cityId = Number($(cityOption).val())
          if (cityName && cityId) {
            cities.push({ id: cityId, name: cityName })
          }
        })
      countriesMap.set(countryName, cities)
    })

    return Array.from(countriesMap.entries()).map(([name, cities]) => ({ name, cities }))
  }

  /**
   * Parses the venues page for the districts of the currently selected city.
   */
  const _parseDistrictsForCity = (html: string): District[] => {
    const $ = cheerio.load(html)
    const districts: District[] = []
    let currentDistrict: District | undefined = undefined

    $('select#district > option').each((_, option) => {
      const opt = $(option)
      const name = opt.text().trim()
      const id = Number(opt.val())

      if (!id || !name) return

      if (opt.hasClass('area')) {
        currentDistrict = { name, id, subDistricts: [] }
        districts.push(currentDistrict)
      } else if (opt.hasClass('area-district') && currentDistrict) {
        currentDistrict.subDistricts.push({ name, id })
      }
    })
    return districts
  }

  /**
   * Parses the venues page to extract all available sport categories.
   */
  const _parseCategories = (html: string): Category[] => {
    const $ = cheerio.load(html)
    const categories: Category[] = []
    $('select#category > option').each((_, option) => {
      const name = $(option).text().trim()
      const id = Number($(option).val())
      if (name && id) {
        categories.push({ id, name })
      }
    })
    return categories
  }

  return {
    /**
     * Fetches a list of all available countries and their main cities.
     * The result is cached in memory after the first successful call.
     */
    async getCountries(): Promise<Country[]> {
      if (cachedCountries) {
        return cachedCountries
      }
      const response = await http.get('/sports')
      const html = await response.text()
      cachedCountries = _parseCountriesAndCities(html)
      return cachedCountries
    },

    /**
     * Fetches a list of all available sport categories.
     * The result is cached in memory after the first successful call.
     */
    async getCategories(): Promise<Category[]> {
      if (cachedCategories) {
        return cachedCategories
      }
      const response = await http.get('/venues')
      const html = await response.text()
      cachedCategories = _parseCategories(html)
      return cachedCategories
    },

    /**
     * Fetches all districts and sub-districts for a given city.
     * Results are cached per cityId.
     * @param cityId The ID of the city.
     */
    async getDistricts(cityId: number): Promise<District[]> {
      if (cachedDistricts.has(cityId)) {
        return cachedDistricts.get(cityId) as District[]
      }
      // To get districts for a specific city, we need to load the /venues page for that city.
      const response = await http.get(`/venues?city_id=${cityId}`)
      const html = await response.text()
      const districts = _parseDistrictsForCity(html)
      if (districts.length === 0) {
        // Fallback for cities that don't have a dedicated page but are in the list.
        // This can happen, and their district list is empty.
      }
      cachedDistricts.set(cityId, districts)
      return districts
    },
  }
}
