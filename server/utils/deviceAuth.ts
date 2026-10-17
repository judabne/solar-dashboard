import type { H3Event } from 'h3'
import { hashDeviceSecret } from './crypto'
import { getSql } from './db'

export interface AuthenticatedDevice {
  id: string
}

export async function requireDevice(event: H3Event): Promise<AuthenticatedDevice> {
  const deviceId = getHeader(event, 'x-device-id')
  const deviceSecret = getHeader(event, 'x-device-secret')

  if (!deviceId || !deviceSecret) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Device credentials required'
    })
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deviceId)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid device identifier'
    })
  }

  const sql = getSql()
  const rows = await sql`
    SELECT id, secret_hash, revoked_at
    FROM paired_devices
    WHERE id = ${deviceId}::uuid
    LIMIT 1
  `

  const row = rows[0] as { id: string, secret_hash: string, revoked_at: string | null } | undefined
  if (!row || row.revoked_at) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Device not paired'
    })
  }

  const expected = hashDeviceSecret(deviceId, deviceSecret)
  if (expected !== row.secret_hash) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid device credentials'
    })
  }

  await sql`
    UPDATE paired_devices
    SET last_seen_at = NOW()
    WHERE id = ${deviceId}::uuid
  `

  return { id: deviceId }
}
