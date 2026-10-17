import { apiErr, apiOk, sendApiResult } from '../../utils/api'
import { requireDevice } from '../../utils/deviceAuth'
import { assertRateLimit } from '../../utils/rateLimit'
import { getHistoryReadings } from '../../services/readings'

export default defineEventHandler(async (event) => {
  const device = await requireDevice(event)
  assertRateLimit(`history:${device.id}`, 60, 60_000)

  const query = getQuery(event)
  const startRaw = String(query.start || '')
  const endRaw = String(query.end || '')

  const rangeStart = startRaw ? new Date(startRaw) : new Date(Date.now() - 24 * 60 * 60 * 1000)
  const rangeEnd = endRaw ? new Date(endRaw) : new Date()

  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    return sendApiResult(event, apiErr('VALIDATION', 'Invalid start or end timestamp'))
  }

  if (rangeEnd.getTime() < rangeStart.getTime()) {
    return sendApiResult(event, apiErr('VALIDATION', 'end must be after start'))
  }

  const maxRangeMs = 8 * 24 * 60 * 60 * 1000
  if (rangeEnd.getTime() - rangeStart.getTime() > maxRangeMs) {
    return sendApiResult(event, apiErr('VALIDATION', 'Maximum range is 8 days'))
  }

  setHeader(event, 'Cache-Control', 'private, no-store')
  const data = await getHistoryReadings(device.id, rangeStart, rangeEnd)
  return sendApiResult(event, apiOk(data))
})
