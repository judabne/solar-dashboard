import type { BatteryStatus } from '#shared/types/readings'
import { getSql } from '../../utils/db'

const PROVIDER = 'batali'

export interface BataliLatestReadings {
  batteryUpdatedAt: string | null
  batteryPercent: number | null
  batteryStatus: BatteryStatus
}

const UNVERIFIED_MESSAGE
  = 'Batali monitoring uses the dgrid.top (LOGON) web platform. A public API for third-party dashboards has not been verified. '
    + 'Connect this provider once official API documentation and credentials are available.'

export async function getBataliStatus(deviceId: string) {
  const sql = getSql()
  const rows = await sql`
    SELECT username
    FROM provider_connections
    WHERE device_id = ${deviceId}::uuid AND provider = ${PROVIDER}
    LIMIT 1
  `
  const row = rows[0] as { username: string | null } | undefined
  return {
    connected: Boolean(row),
    username: row?.username ?? null,
    needsReconnect: false,
    available: false,
    message: UNVERIFIED_MESSAGE
  }
}

export async function connectBatali(_deviceId: string, _username: string, _password: string) {
  throw createError({
    statusCode: 501,
    statusMessage: UNVERIFIED_MESSAGE
  })
}

export async function disconnectBatali(deviceId: string) {
  const sql = getSql()
  await sql`
    DELETE FROM provider_connections
    WHERE device_id = ${deviceId}::uuid AND provider = ${PROVIDER}
  `
}

/** Battery dashboard fields — only from Batali once the API is implemented. */
export async function fetchBataliLatest(deviceId: string) {
  const status = await getBataliStatus(deviceId)
  if (!status.connected) {
    return {
      available: false,
      error: null,
      readings: null as BataliLatestReadings | null
    }
  }

  return {
    available: true,
    error: UNVERIFIED_MESSAGE,
    readings: null as BataliLatestReadings | null
  }
}
