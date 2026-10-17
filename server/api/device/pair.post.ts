import { apiErr, apiOk, sendApiResult } from '../../utils/api'
import { hashDeviceSecret } from '../../utils/crypto'
import { getSql } from '../../utils/db'
import { assertRateLimit } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  assertRateLimit(getRequestIP(event, { xForwardedFor: true }) || 'anon', 30, 60_000)

  const body = await readBody<{ deviceId?: string, deviceSecret?: string }>(event)
  const deviceId = body?.deviceId?.trim()
  const deviceSecret = body?.deviceSecret?.trim()

  if (!deviceId || !deviceSecret) {
    return sendApiResult(event, apiErr('VALIDATION', 'deviceId and deviceSecret are required'))
  }

  if (deviceSecret.length < 32) {
    return sendApiResult(event, apiErr('VALIDATION', 'deviceSecret must be at least 32 characters'))
  }

  const sql = getSql()
  const existing = await sql`
    SELECT id FROM paired_devices WHERE id = ${deviceId}::uuid LIMIT 1
  `

  if (existing.length) {
    return sendApiResult(event, apiOk({ deviceId, registered: false }))
  }

  const secretHash = hashDeviceSecret(deviceId, deviceSecret)
  await sql`
    INSERT INTO paired_devices (id, secret_hash, created_at, last_seen_at)
    VALUES (${deviceId}::uuid, ${secretHash}, NOW(), NOW())
  `

  return sendApiResult(event, apiOk({ deviceId, registered: true }))
})
