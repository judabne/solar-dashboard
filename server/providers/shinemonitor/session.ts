import { decryptString, encryptString } from '../../utils/crypto'
import { getSql } from '../../utils/db'
import { shineAuthenticate, shineQueryDeviceDataDayFull } from './client'
import { fetchPlantEnergyTodayKwh } from './designatedInfo'
import {
  getPlantTodayRange,
  historyWindowStart,
  plantDaysForHistoryRange,
  type ShineHistoryRangeHours
} from './dates'
import {
  enrichDeviceForPlant,
  shineResolvePlantIdForDevice,
  shineResolveValidatedDevice
} from './discover'
import { deviceDataReachable } from './deviceData'
import {
  extractHistoryPoints,
  extractLatestFromHistoryFallback,
  extractLatestRealtimeRow,
  type LatestRealtimeRow
} from './normalize'
import type { HistoryPoint } from '#shared/types/readings'
import type { ShineMonitorStoredSession } from './types'

const PROVIDER = 'shinemonitor'

type ShineHistoryMetric = 'solarGenerationW' | 'gridPowerW' | 'homeConsumptionW'

const SHINE_HISTORY_METRICS: ShineHistoryMetric[] = [
  'solarGenerationW',
  'gridPowerW',
  'homeConsumptionW'
]

function dedupeSortHistoryPoints(points: HistoryPoint[]): HistoryPoint[] {
  const byTimestamp = new Map<string, HistoryPoint>()
  for (const point of points) {
    byTimestamp.set(point.timestamp, point)
  }

  return [...byTimestamp.values()].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}

function applyHistoryWindow(
  buckets: Record<ShineHistoryMetric, HistoryPoint[]>,
  rangeHours: ShineHistoryRangeHours,
  emptyWhenNoData: Date
): {
  points: Record<ShineHistoryMetric, HistoryPoint[]>
  rangeStart: Date
  rangeEnd: Date
} {
  const empty = (): Record<ShineHistoryMetric, HistoryPoint[]> => ({
    solarGenerationW: [],
    gridPowerW: [],
    homeConsumptionW: []
  })

  const all = SHINE_HISTORY_METRICS.flatMap(metric => buckets[metric])
  if (!all.length) {
    return { points: empty(), rangeStart: emptyWhenNoData, rangeEnd: emptyWhenNoData }
  }

  let rangeEndMs = Number.NEGATIVE_INFINITY
  for (const point of all) {
    rangeEndMs = Math.max(rangeEndMs, new Date(point.timestamp).getTime())
  }
  const rangeEnd = new Date(rangeEndMs)
  const rangeStart = historyWindowStart(rangeHours, rangeEndMs, emptyWhenNoData)
  const windowStartMs = rangeStart.getTime()

  const points = empty()
  for (const metric of SHINE_HISTORY_METRICS) {
    points[metric] = dedupeSortHistoryPoints(
      buckets[metric].filter(p => new Date(p.timestamp).getTime() >= windowStartMs)
    )
  }

  return {
    points,
    rangeStart,
    rangeEnd
  }
}

async function ensurePlantContext(
  deviceId: string,
  session: ShineMonitorStoredSession
): Promise<ShineMonitorStoredSession> {
  let plantId = session.plantId ?? null
  if (!plantId) {
    plantId = await shineResolvePlantIdForDevice(session.token, session.secret, session.device)
  }
  if (!plantId) {
    return session
  }

  const device = await enrichDeviceForPlant(session.token, session.secret, plantId, session.device)
  if (plantId === session.plantId && device === session.device) {
    return session
  }

  const next = { ...session, plantId, device }
  await saveSession(deviceId, next, session.username)
  return next
}

async function fetchSolarGeneratedTodayKwh(
  deviceId: string,
  session: ShineMonitorStoredSession
): Promise<number | null> {
  const fresh = await ensurePlantContext(deviceId, session)
  const plantId = fresh.plantId
  const devtype = fresh.device.devtype
  if (!plantId || devtype === undefined || devtype === '') {
    return null
  }

  return fetchPlantEnergyTodayKwh(fresh.token, fresh.secret, plantId, devtype)
}

async function refreshStoredDevice(
  deviceId: string,
  session: ShineMonitorStoredSession,
  token: string,
  secret: string
): Promise<ShineMonitorStoredSession> {
  const device = await shineResolveValidatedDevice(token, secret, session.device)
  if (!device) {
    return session
  }
  const next = { ...session, device }
  await saveSession(deviceId, next, session.username)
  return next
}

async function loadSession(deviceId: string): Promise<ShineMonitorStoredSession | null> {
  const sql = getSql()
  const rows = await sql`
    SELECT encrypted_credentials, token_expires_at
    FROM provider_connections
    WHERE device_id = ${deviceId}::uuid AND provider = ${PROVIDER}
    LIMIT 1
  `
  const row = rows[0] as { encrypted_credentials: string } | undefined
  if (!row) {
    return null
  }
  const json = decryptString(row.encrypted_credentials)
  return JSON.parse(json) as ShineMonitorStoredSession
}

async function saveSession(deviceId: string, session: ShineMonitorStoredSession, username: string) {
  const sql = getSql()
  const encrypted = encryptString(JSON.stringify(session))
  await sql`
    INSERT INTO provider_connections (
      device_id, provider, username, encrypted_credentials, token_expires_at, connected_at, updated_at
    ) VALUES (
      ${deviceId}::uuid,
      ${PROVIDER},
      ${username},
      ${encrypted},
      ${session.tokenExpiresAt}::timestamptz,
      NOW(),
      NOW()
    )
    ON CONFLICT (device_id, provider) DO UPDATE SET
      username = EXCLUDED.username,
      encrypted_credentials = EXCLUDED.encrypted_credentials,
      token_expires_at = EXCLUDED.token_expires_at,
      updated_at = NOW()
  `
}

async function ensureFreshSession(deviceId: string, session: ShineMonitorStoredSession) {
  const expires = new Date(session.tokenExpiresAt).getTime()
  const now = Date.now()
  if (expires - now > 5 * 60 * 1000) {
    return session
  }

  const password = decryptString(session.passwordEnc)
  const auth = await shineAuthenticate(session.username, password)
  const device = await shineResolveValidatedDevice(auth.token, auth.secret, session.device)
  const refreshed: ShineMonitorStoredSession = {
    ...session,
    secret: auth.secret,
    token: auth.token,
    tokenExpiresAt: new Date(now + auth.expire * 1000).toISOString(),
    device: device ?? session.device
  }
  await saveSession(deviceId, refreshed, session.username)
  return refreshed
}

export async function connectShineMonitor(deviceId: string, username: string, password: string) {
  const auth = await shineAuthenticate(username, password)
  const device = await shineResolveValidatedDevice(auth.token, auth.secret)
  if (!device) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ERR_NOT_FOUND_DEVICE'
    })
  }

  const plantId = await shineResolvePlantIdForDevice(auth.token, auth.secret, device)
  const resolvedDevice = plantId
    ? await enrichDeviceForPlant(auth.token, auth.secret, plantId, device)
    : device

  const session: ShineMonitorStoredSession = {
    username,
    passwordEnc: encryptString(password),
    secret: auth.secret,
    token: auth.token,
    tokenExpiresAt: new Date(Date.now() + auth.expire * 1000).toISOString(),
    device: resolvedDevice,
    ...(plantId ? { plantId } : {})
  }
  await saveSession(deviceId, session, username)
}

export async function disconnectShineMonitor(deviceId: string) {
  const sql = getSql()
  await sql`
    DELETE FROM provider_connections
    WHERE device_id = ${deviceId}::uuid AND provider = ${PROVIDER}
  `
}

export async function getShineMonitorStatus(deviceId: string) {
  const sql = getSql()
  const rows = await sql`
    SELECT username, token_expires_at, encrypted_credentials
    FROM provider_connections
    WHERE device_id = ${deviceId}::uuid AND provider = ${PROVIDER}
    LIMIT 1
  `
  const row = rows[0] as {
    username: string | null
    token_expires_at: string | null
    encrypted_credentials: string
  } | undefined

  if (!row) {
    return {
      connected: false,
      username: null,
      needsReconnect: false
    }
  }

  let needsReconnect = false
  if (row.token_expires_at) {
    needsReconnect = new Date(row.token_expires_at).getTime() <= Date.now()
  }

  try {
    const session = JSON.parse(decryptString(row.encrypted_credentials)) as ShineMonitorStoredSession
    if (!session.passwordEnc || !session.device?.pn) {
      needsReconnect = true
    }
  } catch {
    needsReconnect = true
  }

  return {
    connected: true,
    username: row.username,
    needsReconnect
  }
}

function latestRowHasValues(row: LatestRealtimeRow) {
  return (
    row.inverterUpdatedAt !== null
    || row.solarGenerationW !== null
    || row.gridPowerW !== null
    || row.homeConsumptionW !== null
  )
}

function parseLatestFromDay(
  dat: Parameters<typeof extractLatestRealtimeRow>[0],
  plantDateYmd: string
): LatestRealtimeRow | null {
  const parsed
    = extractLatestRealtimeRow(dat, plantDateYmd)
      ?? extractLatestFromHistoryFallback(dat, plantDateYmd)
  if (!parsed || !latestRowHasValues(parsed)) {
    return null
  }
  return parsed
}

function isNewerLatestRow(candidate: LatestRealtimeRow, current: LatestRealtimeRow | null) {
  if (!current) {
    return true
  }
  const candidateMs = candidate.inverterUpdatedAt
    ? new Date(candidate.inverterUpdatedAt).getTime()
    : Number.NEGATIVE_INFINITY
  const currentMs = current.inverterUpdatedAt
    ? new Date(current.inverterUpdatedAt).getTime()
    : Number.NEGATIVE_INFINITY
  return candidateMs > currentMs
}

export async function fetchShineMonitorLatest(deviceId: string) {
  const session = await loadSession(deviceId)
  if (!session) {
    return {
      available: false,
      error: null,
      readings: null
    }
  }

  try {
    let fresh = await ensureFreshSession(deviceId, session)
    const energyTodayPromise = fetchSolarGeneratedTodayKwh(deviceId, fresh)
    let deviceRefreshed = false
    let best: LatestRealtimeRow | null = null
    let lastError: string | null = null

    const deviceBase = () => ({
      pn: fresh.device.pn,
      sn: fresh.device.sn,
      devcode: String(fresh.device.devcode),
      devaddr: String(fresh.device.devaddr)
    })

    for (const date of plantDaysForHistoryRange(24)) {
      let response = await shineQueryDeviceDataDayFull(fresh.token, fresh.secret, {
        ...deviceBase(),
        date
      })

      if (!deviceDataReachable(response) && !deviceRefreshed) {
        fresh = await refreshStoredDevice(deviceId, fresh, fresh.token, fresh.secret)
        deviceRefreshed = true
        response = await shineQueryDeviceDataDayFull(fresh.token, fresh.secret, {
          ...deviceBase(),
          date
        })
      }

      if (!deviceDataReachable(response)) {
        lastError = response.desc || 'ShineMonitor returned an error'
        continue
      }

      if (response.err !== 0) {
        lastError = response.desc || `ShineMonitor error (${response.err})`
        continue
      }

      const parsed = parseLatestFromDay(response.dat, date)
      if (parsed && isNewerLatestRow(parsed, best)) {
        best = parsed
      }
    }

    if (!best) {
      return {
        available: true,
        error: lastError ?? 'No realtime readings from ShineMonitor',
        readings: null
      }
    }

    const solarGeneratedTodayKwh = await energyTodayPromise

    return {
      available: true,
      error: null,
      readings: {
        inverterUpdatedAt: best.inverterUpdatedAt,
        solarGenerationW: best.solarGenerationW,
        solarGeneratedTodayKwh,
        gridPowerW: best.gridPowerW,
        homeConsumptionW: best.homeConsumptionW,
        workState: best.workState
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ShineMonitor request failed'
    return {
      available: true,
      error: message,
      readings: null
    }
  }
}

/** `queryDeviceDataOneDay` per plant calendar day; window ends at latest sample, not server clock. */
export async function fetchShineMonitorHistory(
  deviceId: string,
  rangeHours: ShineHistoryRangeHours = 24
) {
  const empty = (): Record<ShineHistoryMetric, HistoryPoint[]> => ({
    solarGenerationW: [],
    gridPowerW: [],
    homeConsumptionW: []
  })

  const { start: dayStart } = getPlantTodayRange()

  const session = await loadSession(deviceId)
  if (!session) {
    return {
      available: false,
      points: empty(),
      rangeStart: dayStart,
      rangeEnd: dayStart,
      message: 'Not connected'
    }
  }
  const fresh = await ensureFreshSession(deviceId, session)
  const buckets = empty()

  const deviceBase = {
    pn: fresh.device.pn,
    sn: fresh.device.sn,
    devcode: String(fresh.device.devcode),
    devaddr: String(fresh.device.devaddr)
  }

  for (const date of plantDaysForHistoryRange(rangeHours)) {
    const response = await shineQueryDeviceDataDayFull(fresh.token, fresh.secret, {
      ...deviceBase,
      date
    })
    if (response.err !== 0 || !response.dat) {
      continue
    }
    for (const metric of SHINE_HISTORY_METRICS) {
      buckets[metric].push(...extractHistoryPoints(response.dat, metric, date))
    }
  }

  const { points, rangeStart, rangeEnd } = applyHistoryWindow(buckets, rangeHours, dayStart)

  return {
    available: true,
    points,
    rangeStart,
    rangeEnd,
    message: null
  }
}
