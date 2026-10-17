import { apiOk, sendApiResult } from '../../../utils/api'
import { requireDevice } from '../../../utils/deviceAuth'
import { disconnectShineMonitor } from '../../../providers/shinemonitor/session'

export default defineEventHandler(async (event) => {
  const device = await requireDevice(event)
  await disconnectShineMonitor(device.id)
  return sendApiResult(event, apiOk({ connected: false }))
})
