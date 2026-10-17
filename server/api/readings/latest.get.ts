import { apiOk, sendApiResult } from '../../utils/api'
import { requireDevice } from '../../utils/deviceAuth'
import { assertRateLimit } from '../../utils/rateLimit'
import { getLatestReadings } from '../../services/readings'

export default defineEventHandler(async (event) => {
  const device = await requireDevice(event)
  assertRateLimit(`readings:${device.id}`, 120, 60_000)

  setHeader(event, 'Cache-Control', 'private, no-store')
  const data = await getLatestReadings(device.id)
  return sendApiResult(event, apiOk(data))
})
