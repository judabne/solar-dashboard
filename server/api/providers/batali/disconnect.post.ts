import { apiOk, sendApiResult } from '../../../utils/api'
import { requireDevice } from '../../../utils/deviceAuth'
import { disconnectBatali } from '../../../providers/batali'

export default defineEventHandler(async (event) => {
  const device = await requireDevice(event)
  await disconnectBatali(device.id)
  return sendApiResult(event, apiOk({ connected: false }))
})
