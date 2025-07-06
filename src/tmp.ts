import { fetchEventsHandler } from './ics/handler.js'
;(async () => {
  const events = await fetchEventsHandler({ startDate: '2025-07-07', endDate: '2025-07-07' })
  console.log(events)
})().catch(console.error)
