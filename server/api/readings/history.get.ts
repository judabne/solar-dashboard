import { apiErr, apiOk, sendApiResult } from '../../utils/api'
import { requireDevice } from '../../utils/deviceAuth'
import { normalizeHistoryRangeHours } from '../../providers/shinemonitor/dates'
import { assertRateLimit } from '../../utils/rateLimit'
import { getHistoryReadings } from '../../services/readings'

export default defineEventHandler(async (event) => {
  const device = await requireDevice(event)
  assertRateLimit(`history:${device.id}`, 60, 60_000)

  const hoursQuery = getQuery(event).hours
  const hoursRaw = Number(hoursQuery)
  if (hoursQuery !== undefined && hoursQuery !== '' && hoursRaw !== 24 && hoursRaw !== 72) {
    return sendApiResult(event, apiErr('VALIDATION', 'hours must be 24 or 72'))
  }
  const rangeHours = normalizeHistoryRangeHours(hoursRaw)

  setHeader(event, 'Cache-Control', 'private, no-store')
  const data = await getHistoryReadings(device.id, rangeHours)
  return sendApiResult(event, apiOk(data))
})
