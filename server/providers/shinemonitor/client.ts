import { sha1Hex } from '../../utils/crypto'
import { resolveShineMonitorConfig } from './config'
import { deviceDataReachable } from './deviceData'
import { shineMonitorBusinessVariants } from './variants'
import type {
  ShineMonitorAuthResponse,
  ShineMonitorBusinessRequestOptions,
  ShineMonitorCollectorsResponse,
  ShineMonitorCollectorDevicesResponse,
  ShineMonitorDataResponse,
  ShineMonitorDataRow,
  ShineMonitorDataTitle,
  ShineMonitorDevicesResponse,
  ShineMonitorPlantsResponse
} from './types'

function formatUsrParam(usr: string): string {
  return encodeURIComponent(usr.trim()).replace(/\+/g, '%2B').replace(/'/g, '%27')
}

function appParams(): Array<[string, string]> {
  const c = resolveShineMonitorConfig()
  return [
    ['source', String(c.source)],
    ['_app_id_', c.appId],
    ['_app_version_', c.appVersion],
    ['_app_client_', c.appClient]
  ]
}

function actionSuffix(parts: Array<[string, string]>): string {
  let suffix = ''
  for (const [key, value] of parts) {
    suffix += `&${key}=${value}`
  }
  return suffix
}

async function fetchShineJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  })

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: 'ShineMonitor request failed'
    })
  }

  return (await response.json()) as T
}

async function authRequest(
  action: 'auth' | 'authEmail',
  username: string,
  passwordPlain: string
): Promise<ShineMonitorAuthResponse> {
  const c = resolveShineMonitorConfig()
  const pwdHash = sha1Hex(passwordPlain)
  const usr = formatUsrParam(username)
  const actionPart = `&action=${action}&usr=${usr}&company-key=${c.companyKey}`
  const salt = String(Date.now())
  const sign = sha1Hex(salt + pwdHash + actionPart)
  const url = `${c.baseUrl}?sign=${sign}&salt=${salt}${actionPart}`
  return fetchShineJson<ShineMonitorAuthResponse>(url)
}

function isNotFoundUser(body: ShineMonitorAuthResponse): boolean {
  return (body.desc || '').includes('NOT_FOUND_USR')
}

export async function shineAuthenticate(username: string, passwordPlain: string) {
  const trimmed = username.trim()
  let body = await authRequest('auth', trimmed, passwordPlain)

  if ((body.err !== 0 || !body.dat) && isNotFoundUser(body) && trimmed.includes('@')) {
    body = await authRequest('authEmail', trimmed, passwordPlain)
  }

  if (body.err !== 0 || !body.dat) {
    throw createError({
      statusCode: 401,
      statusMessage: body.desc || 'ShineMonitor authentication failed'
    })
  }

  return body.dat
}

function localeParams(): Array<[string, string]> {
  const c = resolveShineMonitorConfig()
  return [
    ['i18n', c.i18n],
    ['lang', c.lang]
  ]
}

export async function shineBusinessRequest<T>(
  secret: string,
  token: string,
  parts: Array<[string, string]>,
  options?: ShineMonitorBusinessRequestOptions & { baseUrl?: string }
): Promise<T> {
  const c = resolveShineMonitorConfig()
  const useAppParams = options?.useAppParams ?? c.businessUseAppParams
  const ordered: Array<[string, string]> = useAppParams
    ? [...parts, ...appParams()]
    : parts
  const businessAction = actionSuffix(ordered)
  const salt = String(Date.now())
  const sign = sha1Hex(salt + secret + token + businessAction)
  const baseUrl = options?.baseUrl ?? c.baseUrl
  const url = `${baseUrl}?sign=${sign}&salt=${salt}&token=${token}${businessAction}`
  return fetchShineJson<T>(url)
}

function isNotFoundDevice(desc: string | undefined): boolean {
  return (desc || '').includes('NOT_FOUND_DEVICE')
}

export async function shineQueryDevices(
  token: string,
  secret: string,
  options?: ShineMonitorBusinessRequestOptions & { plantid?: string }
) {
  const parts: Array<[string, string]> = [
    ['action', 'queryDevices']
  ]
  if (options?.plantid) {
    parts.push(['plantid', options.plantid])
  }
  parts.push(...localeParams(), ['page', '0'], ['pagesize', '50'])
  const body = await shineBusinessRequest<ShineMonitorDevicesResponse>(secret, token, parts, options)

  if (body.err !== 0) {
    if (isNotFoundDevice(body.desc)) {
      return []
    }
    throw createError({
      statusCode: 502,
      statusMessage: body.desc || 'Failed to list ShineMonitor devices'
    })
  }

  return body.dat?.device ?? []
}

type DeviceDataArgs = {
  pn: string
  devcode: string
  devaddr: string
  sn: string
  date: string
}

function deviceDataPagingParts(args: DeviceDataArgs, page: number): Array<[string, string]> {
  return [
    ['action', 'queryDeviceDataOneDayPaging'],
    ['devaddr', args.devaddr],
    ['oddEvenRow', 'null'],
    ['pn', args.pn],
    ['devcode', args.devcode],
    ['sn', args.sn],
    ['date', args.date],
    ['page', String(page)],
    ['pagesize', '50'],
    ...localeParams()
  ]
}

function deviceDataOneDayParts(args: DeviceDataArgs): Array<[string, string]> {
  return [
    ['action', 'queryDeviceDataOneDay'],
    ...localeParams(),
    ['pn', args.pn],
    ['devcode', args.devcode],
    ['devaddr', args.devaddr],
    ['sn', args.sn],
    ['date', args.date]
  ]
}

async function requestDeviceData(
  token: string,
  secret: string,
  parts: Array<[string, string]>
): Promise<ShineMonitorDataResponse> {
  let last: ShineMonitorDataResponse = { err: 1, desc: 'ERR_NOT_FOUND_DEVICE' }

  for (const variant of shineMonitorBusinessVariants()) {
    const body = await shineBusinessRequest<ShineMonitorDataResponse>(secret, token, parts, variant)
    last = body
    if (body.err === 0) {
      return body
    }
    if (!isNotFoundDevice(body.desc)) {
      const desc = body.desc || ''
      if (desc.includes('NO_RECORD') || desc.includes('ERR_NO_RECORD')) {
        return body
      }
    }
  }

  return last
}

/** Live / snapshot payload (includes realtime row); preferred for “latest”. */
export async function shineQueryDeviceDataSnapshot(
  token: string,
  secret: string,
  args: DeviceDataArgs
) {
  return requestDeviceData(token, secret, deviceDataOneDayParts(args))
}

export async function shineQueryDeviceDataOneDay(
  token: string,
  secret: string,
  args: DeviceDataArgs
) {
  const snapshot = await shineQueryDeviceDataSnapshot(token, secret, args)
  if (deviceDataReachable(snapshot) && (snapshot.dat?.row?.length ?? 0) > 0) {
    return snapshot
  }
  const paging = await requestDeviceData(token, secret, deviceDataPagingParts(args, 0))
  if (deviceDataReachable(paging)) {
    return paging
  }
  return snapshot
}

async function fetchDeviceDataPaged(
  token: string,
  secret: string,
  args: DeviceDataArgs
): Promise<ShineMonitorDataResponse | null> {
  for (const variant of shineMonitorBusinessVariants()) {
    let page = 0
    let title: ShineMonitorDataTitle[] | undefined
    const rows: ShineMonitorDataRow[] = []

    while (page < 80) {
      const body = await shineBusinessRequest<ShineMonitorDataResponse>(
        secret,
        token,
        deviceDataPagingParts(args, page),
        variant
      )
      if (!deviceDataReachable(body) || !body.dat) {
        break
      }
      if (body.err !== 0) {
        break
      }
      if (!title?.length && body.dat.title?.length) {
        title = body.dat.title
      }
      const batch = body.dat.row ?? []
      if (!batch.length) {
        break
      }
      rows.push(...batch)
      const pagesize = body.dat.pagesize ?? batch.length
      page += 1
      // Do not trust `dat.total` — the API often reports the first page size, not row count.
      if (batch.length < pagesize) {
        return {
          err: 0,
          desc: 'ERR_NONE',
          dat: {
            title: title ?? [],
            row: rows,
            total: rows.length,
            page: 0,
            pagesize: rows.length
          }
        }
      }
    }

    if (rows.length) {
      return {
        err: 0,
        desc: 'ERR_NONE',
        dat: {
          title: title ?? [],
          row: rows,
          total: rows.length,
          page: 0,
          pagesize: rows.length
        }
      }
    }
  }

  return null
}

function rowIdentity(row: ShineMonitorDataRow): string {
  const values = row.field ?? row.filed ?? []
  return values[0] ?? JSON.stringify(values)
}

/** Paging omits the live `realtime` row; snapshot always includes it. */
function mergePagedDayWithSnapshot(
  paged: ShineMonitorDataResponse,
  snapshot: ShineMonitorDataResponse
): ShineMonitorDataResponse {
  const pagedRows = paged.dat?.row ?? []
  const snapshotRows = snapshot.dat?.row ?? []
  if (!snapshotRows.length) {
    return paged
  }

  const title = paged.dat?.title?.length ? paged.dat.title : snapshot.dat?.title ?? []
  const byId = new Map<string, ShineMonitorDataRow>()
  for (const row of pagedRows) {
    byId.set(rowIdentity(row), row)
  }
  for (const row of snapshotRows) {
    const id = rowIdentity(row)
    if (row.realtime === true || !byId.has(id)) {
      byId.set(id, row)
    }
  }

  const row = [...byId.values()]
  return {
    err: 0,
    desc: 'ERR_NONE',
    dat: {
      title,
      row,
      total: row.length,
      page: 0,
      pagesize: row.length
    }
  }
}

export async function shineQueryDeviceDataDayFull(
  token: string,
  secret: string,
  args: DeviceDataArgs
): Promise<ShineMonitorDataResponse> {
  const [paged, snapshot] = await Promise.all([
    fetchDeviceDataPaged(token, secret, args),
    shineQueryDeviceDataSnapshot(token, secret, args)
  ])

  if (paged?.dat?.row?.length) {
    return mergePagedDayWithSnapshot(paged, snapshot)
  }

  if (deviceDataReachable(snapshot) && (snapshot.dat?.row?.length ?? 0) > 0) {
    return snapshot
  }

  const oneDay = await requestDeviceData(token, secret, deviceDataOneDayParts(args))
  if (deviceDataReachable(oneDay)) {
    return oneDay
  }
  return snapshot.err === 0 ? snapshot : oneDay
}

export async function shineQueryPlants(
  token: string,
  secret: string,
  options?: ShineMonitorBusinessRequestOptions
) {
  const body = await shineBusinessRequest<ShineMonitorPlantsResponse>(secret, token, [
    ['action', 'queryPlants'],
    ...localeParams(),
    ['orderBy', 'ascPlantName'],
    ['page', '0'],
    ['pagesize', '50']
  ], options)

  if (body.err !== 0) {
    if ((body.desc || '').includes('NOT_FOUND_PLANT')) {
      return []
    }
    throw createError({
      statusCode: 502,
      statusMessage: body.desc || 'Failed to list ShineMonitor plants'
    })
  }

  return body.dat?.plant ?? []
}

export async function shineQueryCollectors(
  token: string,
  secret: string,
  args?: { plantid?: string, options?: ShineMonitorBusinessRequestOptions }
) {
  const parts: Array<[string, string]> = [
    ['action', 'queryCollectors']
  ]
  if (args?.plantid) {
    parts.push(['plantid', args.plantid])
  }
  parts.push(...localeParams(), ['page', '0'], ['pagesize', '50'])
  const body = await shineBusinessRequest<ShineMonitorCollectorsResponse>(
    secret,
    token,
    parts,
    args?.options
  )

  if (body.err !== 0) {
    if ((body.desc || '').includes('NOT_FOUND_COLLECTOR') || (body.desc || '').includes('NOT_FOUND_PLANT')) {
      return []
    }
    throw createError({
      statusCode: 502,
      statusMessage: body.desc || 'Failed to list ShineMonitor collectors'
    })
  }

  return body.dat?.collector ?? []
}

export async function shineQueryCollectorDevices(
  token: string,
  secret: string,
  pn: string,
  options?: ShineMonitorBusinessRequestOptions
) {
  const body = await shineBusinessRequest<ShineMonitorCollectorDevicesResponse>(secret, token, [
    ['action', 'queryCollectorDevices'],
    ...localeParams(),
    ['pn', pn]
  ], options)

  if (body.err !== 0) {
    if (isNotFoundDevice(body.desc) || (body.desc || '').includes('NOT_FOUND_COLLECTOR')) {
      return []
    }
    throw createError({
      statusCode: 502,
      statusMessage: body.desc || 'Failed to list devices on collector'
    })
  }

  return body.dat?.dev ?? []
}
