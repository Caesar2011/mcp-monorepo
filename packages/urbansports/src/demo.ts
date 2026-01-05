/* eslint-disable use-logger-not-console/replace-console-with-logger */
import { UrbanSportsClient } from './sdk/index.js'

const usc = new UrbanSportsClient({
  username: process.env.URBAN_USER,
  password: process.env.URBAN_PASS,
})

//await usc.login()
//console.log(await usc.account.getMembership())

//console.log(await usc.activities.search({ date: new Date('2026-01-10') }))
//console.log(await usc.activities.get('97518437'))

//console.dir(await usc.meta.getCategories(), { depth: null, colors: true })
//console.dir(await usc.meta.getCountries(), { depth: null, colors: true })
//console.dir(await usc.meta.getDistricts(93), { depth: null, colors: true })

/*
console.dir(
  await usc.venues.search({
    cityId: 1,
    query: 'simon',
    userLat: 52.521198477527555,
    userLon: 13.301310880733224,
    categoryIds: [40046],
  }),
  { depth: null, colors: true },
)
*/

console.dir(await usc.booking.book(97483154))
//console.dir(await usc.booking.cancel(97518437))
