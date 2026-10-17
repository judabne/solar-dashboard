import { apiErr, apiOk, sendApiResult } from '../../../utils/api'
import { requireDevice } from '../../../utils/deviceAuth'
import { connectBatali } from '../../../providers/batali'

export default defineEventHandler(async (event) => {
  const device = await requireDevice(event)
  const body = await readBody<{ username?: string, password?: string }>(event)
  const username = body?.username?.trim()
  const password = body?.password

  if (!username || !password) {
    return sendApiResult(event, apiErr('VALIDATION', 'username and password are required'))
  }

  try {
    await connectBatali(device.id, username, password)
    return sendApiResult(event, apiOk({ connected: true }))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed'
    return sendApiResult(event, apiErr('PROVIDER_UNAVAILABLE', message))
  }
})
