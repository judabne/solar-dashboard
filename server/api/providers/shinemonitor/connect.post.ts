import { apiErr, apiOk, sendApiResult } from '../../../utils/api'
import { requireDevice } from '../../../utils/deviceAuth'
import { assertRateLimit } from '../../../utils/rateLimit'
import { connectShineMonitor } from '../../../providers/shinemonitor/session'

export default defineEventHandler(async (event) => {
  const device = await requireDevice(event)
  assertRateLimit(`shinemonitor-connect:${device.id}`, 10, 60_000)

  const body = await readBody<{ username?: string, password?: string }>(event)
  const username = body?.username?.trim()
  const password = body?.password

  if (!username || !password) {
    return sendApiResult(event, apiErr('VALIDATION', 'username and password are required'))
  }

  try {
    await connectShineMonitor(device.id, username, password)
    return sendApiResult(event, apiOk({ connected: true }))
  } catch (error) {
    const message = (error as { statusMessage?: string })?.statusMessage
      || (error instanceof Error ? error.message : 'Connection failed')
    return sendApiResult(event, apiErr('PROVIDER_AUTH', message))
  }
})
