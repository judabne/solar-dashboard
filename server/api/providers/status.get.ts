import { apiOk, sendApiResult } from '../../utils/api'
import { requireDevice } from '../../utils/deviceAuth'
import { getBataliStatus } from '../../providers/batali'
import { getShineMonitorStatus } from '../../providers/shinemonitor/session'

export default defineEventHandler(async (event) => {
  const device = await requireDevice(event)
  setHeader(event, 'Cache-Control', 'private, no-store')

  const [shinemonitor, batali] = await Promise.all([
    getShineMonitorStatus(device.id),
    getBataliStatus(device.id)
  ])

  return sendApiResult(event, apiOk({
    shinemonitor: {
      connected: shinemonitor.connected,
      username: shinemonitor.username,
      needsReconnect: shinemonitor.needsReconnect,
      available: true,
      message: null
    },
    batali: {
      connected: batali.connected,
      username: batali.username,
      needsReconnect: batali.needsReconnect,
      available: batali.available,
      message: batali.message
    }
  }))
})
