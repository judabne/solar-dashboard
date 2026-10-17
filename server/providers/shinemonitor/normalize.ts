import type { BatteryStatus, HistoryPoint } from '#shared/types/readings'
import { parsePlantDateTimeString } from './dates'
import type { ShineMonitorDataResponse, ShineMonitorDataRow } from './types'

const FIELD_ALIASES: Record<string, string[]> = {
  solarGenerationW: [
    'Charger Power',
    'charger power',
    'PV Power',
    'Solar Power',
    '充电功率',
    'PV1输入功率',
    'PV2输入功率',
    'Total PV Power',
    'PV Total Power',
    'Output Power',
    'AC Output Power',
    'Generation Power'
  ],
  gridPowerW: ['PGrid', 'Grid Power', '并网功率', 'Grid power', 'To Grid', 'From Grid', 'Grid Export'],
  homeConsumptionW: ['PLoad', 'Load Power', '负载功率', 'Home Load', 'Load power', 'EPS Power', 'Backup Load'],
  battCurrentA: ['Batt Current', 'Battery Current', '电池电流'],
  batteryVoltageV: ['Battery Voltage', '电池电压'],
  batteryPercent: ['SOC', 'Battery SOC', 'Battery Capacity', '电池电量', '电池SOC', 'State of Charge'],
  workState: ['work state', 'Work State', '工作状态', '逆变器工作模式']
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase()
}

function buildTitleIndex(titles: { title: string }[]): Map<string, number> {
  const map = new Map<string, number>()
  titles.forEach((t, index) => {
    map.set(normalizeTitle(t.title), index)
  })
  return map
}

function findFieldIndex(titleIndex: Map<string, number>, keys: string[]): number | null {
  for (const key of keys) {
    const idx = titleIndex.get(normalizeTitle(key))
    if (idx !== undefined) {
      return idx
    }
  }
  return null
}

function findFieldIndexFuzzy(titleIndex: Map<string, number>, keys: string[]): number | null {
  const direct = findFieldIndex(titleIndex, keys)
  if (direct !== null) {
    return direct
  }
  for (const [normalizedTitle, idx] of titleIndex.entries()) {
    for (const key of keys) {
      const needle = normalizeTitle(key)
      if (normalizedTitle.includes(needle) || needle.includes(normalizedTitle)) {
        return idx
      }
    }
  }
  return null
}

function findMetricColumnIndex(
  titleIndex: Map<string, number>,
  titles: { title: string }[],
  metric: keyof typeof FIELD_ALIASES
): number | null {
  const aliases = FIELD_ALIASES[metric] ?? []
  const idx = findFieldIndexFuzzy(titleIndex, aliases)
  if (idx !== null) {
    return idx
  }

  if (metric === 'solarGenerationW') {
    const pvPowers = titles
      .map((t, index) => ({ index, title: normalizeTitle(t.title) }))
      .filter(entry => entry.title.includes('pv') && (entry.title.includes('power') || entry.title.includes('功率')))
    const onlyPv = pvPowers[0]
    if (pvPowers.length === 1 && onlyPv) {
      return onlyPv.index
    }
  }

  return null
}

function readMetricValue(
  values: string[],
  titleIndex: Map<string, number>,
  titles: { title: string }[],
  metric: keyof typeof FIELD_ALIASES
): number | null {
  const idx = findMetricColumnIndex(titleIndex, titles, metric)
  if (idx === null) {
    return null
  }
  return parseNumber(values[idx] ?? undefined)
}

function rowValues(row: ShineMonitorDataRow): string[] {
  return row.field ?? row.filed ?? []
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value === null || value === '') {
    return null
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const TIMESTAMP_TITLE_KEYS = [
  '时间戳',
  'timestamp',
  'time stamp',
  'time',
  'update time',
  'data time',
  '采集时间',
  '记录时间',
  'date time'
]

function parseUnixMillis(value: string | undefined): Date | null {
  if (!value) {
    return null
  }
  const trimmed = value.trim()
  if (/^\d{13}$/.test(trimmed)) {
    return new Date(Number(trimmed))
  }
  if (/^\d{10}$/.test(trimmed)) {
    return new Date(Number(trimmed) * 1000)
  }
  return null
}

function combinePlantDateTime(
  idField: string | undefined,
  tsField: string | undefined,
  plantDateYmd?: string
): string | null {
  const datePart = idField?.trim().replace(/\//g, '-').match(/^(\d{4}-\d{2}-\d{2})/)?.[1]
    ?? plantDateYmd
  const timeSource = tsField?.trim() || idField?.trim()
  const timePart = timeSource?.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!datePart || !timePart) {
    return null
  }
  return `${datePart} ${timePart[1]}:${timePart[2]}:${timePart[3] ?? '00'}`
}

function parseTimestamp(
  idField: string | undefined,
  tsField: string | undefined,
  plantDateYmd?: string
): string | null {
  const fromUnix = parseUnixMillis(idField) ?? parseUnixMillis(tsField)
  if (fromUnix) {
    return fromUnix.toISOString()
  }

  const combined = combinePlantDateTime(idField, tsField, plantDateYmd)
  if (combined) {
    const plantLocal = parsePlantDateTimeString(combined)
    if (plantLocal) {
      return plantLocal.toISOString()
    }
  }

  if (!tsField) {
    return null
  }
  const normalized = tsField.replace(/\s+/g, ' ').trim()
  const plantLocal = parsePlantDateTimeString(normalized)
  if (plantLocal) {
    return plantLocal.toISOString()
  }
  const candidates = [
    normalized.replace(' ', 'T'),
    normalized
  ]
  for (const candidate of candidates) {
    const asDate = new Date(candidate)
    if (!Number.isNaN(asDate.getTime())) {
      return asDate.toISOString()
    }
  }
  if (idField) {
    const fallback = new Date(idField.replace(/\//g, '-'))
    if (!Number.isNaN(fallback.getTime())) {
      return fallback.toISOString()
    }
  }
  return null
}

function extractRowTimestamp(
  values: string[],
  titleIndex: Map<string, number>,
  plantDateYmd?: string
): string | null {
  const tsIdx = findFieldIndex(titleIndex, TIMESTAMP_TITLE_KEYS)
  const tsField = tsIdx !== null ? values[tsIdx] : values[1]
  return parseTimestamp(values[0], tsField, plantDateYmd)
}

function pickLatestDataRow(
  rows: ShineMonitorDataRow[],
  titleIndex: Map<string, number>,
  plantDateYmd?: string
): ShineMonitorDataRow | null {
  if (!rows.length) {
    return null
  }

  const ranked = rows
    .map((row) => {
      const values = rowValues(row)
      const updatedAt = extractRowTimestamp(values, titleIndex, plantDateYmd)
      const t = updatedAt ? new Date(updatedAt).getTime() : Number.NEGATIVE_INFINITY
      return { row, t, realtime: row.realtime === true }
    })
    .filter(entry => Number.isFinite(entry.t))

  const realtimePool = ranked.filter(entry => entry.realtime)
  const pool = realtimePool.length ? realtimePool : ranked

  if (pool.length) {
    return pool.reduce((best, entry) => (entry.t > best.t ? entry : best)).row
  }

  const realtimeRows = rows.filter(r => r.realtime === true)
  const fallbackPool = realtimeRows.length ? realtimeRows : rows
  return fallbackPool[fallbackPool.length - 1] ?? null
}

export function parseWorkStateBatteryStatus(workState: string | null): BatteryStatus {
  if (!workState) {
    return 'unknown'
  }
  const s = workState.toLowerCase()
  if (s.includes('charg')) {
    return 'charging'
  }
  if (s.includes('discharg')) {
    return 'discharging'
  }
  if (s.includes('idle') || s.includes('standby') || s.includes('normal') || s.includes('正常')) {
    return 'idle'
  }
  return 'unknown'
}

export function extractLatestRealtimeRow(
  dat: ShineMonitorDataResponse['dat'],
  plantDateYmd?: string
) {
  if (!dat?.row?.length || !dat.title?.length) {
    return null
  }
  const titleIndex = buildTitleIndex(dat.title)
  const row = pickLatestDataRow(dat.row, titleIndex, plantDateYmd)
  if (!row) {
    return null
  }
  const values = rowValues(row)
  if (!values.length) {
    return null
  }

  const updatedAt = extractRowTimestamp(values, titleIndex, plantDateYmd)

  const workStateRaw = findFieldIndexFuzzy(titleIndex, FIELD_ALIASES.workState ?? [])
  const workState = workStateRaw === null ? null : values[workStateRaw] ?? null

  return {
    inverterUpdatedAt: updatedAt,
    solarGenerationW: readMetricValue(values, titleIndex, dat.title, 'solarGenerationW'),
    gridPowerW: readMetricValue(values, titleIndex, dat.title, 'gridPowerW'),
    homeConsumptionW: readMetricValue(values, titleIndex, dat.title, 'homeConsumptionW'),
    workState
  }
}

export type LatestRealtimeRow = NonNullable<ReturnType<typeof extractLatestRealtimeRow>>

/** When realtime row parsing fails but day paging has points (same data charts use). */
export function extractLatestFromHistoryFallback(
  dat: ShineMonitorDataResponse['dat'],
  plantDateYmd: string
): LatestRealtimeRow | null {
  if (!dat?.title?.length) {
    return null
  }

  const metrics = ['solarGenerationW', 'gridPowerW', 'homeConsumptionW'] as const
  let inverterUpdatedAt: string | null = null
  const values: Partial<Record<(typeof metrics)[number], number | null>> = {}

  for (const metric of metrics) {
    const points = extractHistoryPoints(dat, metric, plantDateYmd)
    const last = points[points.length - 1]
    if (!last) {
      continue
    }
    values[metric] = last.value
    if (last.timestamp && (!inverterUpdatedAt || last.timestamp > inverterUpdatedAt)) {
      inverterUpdatedAt = last.timestamp
    }
  }

  if (
    inverterUpdatedAt === null
    && values.solarGenerationW === undefined
    && values.gridPowerW === undefined
    && values.homeConsumptionW === undefined
  ) {
    return null
  }

  return {
    inverterUpdatedAt,
    solarGenerationW: values.solarGenerationW ?? null,
    gridPowerW: values.gridPowerW ?? null,
    homeConsumptionW: values.homeConsumptionW ?? null,
    workState: null
  }
}

export function extractHistoryPoints(
  dat: ShineMonitorDataResponse['dat'],
  metric: 'solarGenerationW' | 'gridPowerW' | 'homeConsumptionW',
  plantDateYmd?: string
): HistoryPoint[] {
  if (!dat?.row?.length || !dat.title?.length) {
    return []
  }
  const titleIndex = buildTitleIndex(dat.title)
  if (findMetricColumnIndex(titleIndex, dat.title, metric) === null) {
    return []
  }

  const points: HistoryPoint[] = []
  for (const row of dat.row) {
    const values = rowValues(row)
    const timestamp = extractRowTimestamp(values, titleIndex, plantDateYmd)
    if (!timestamp) {
      continue
    }
    points.push({
      timestamp,
      value: readMetricValue(values, titleIndex, dat.title, metric)
    })
  }
  return points
}
