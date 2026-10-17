const DEFAULT_PLANT_TZ = 'Asia/Beirut'

export function getPlantTimeZone(): string {
  try {
    const tz = useRuntimeConfig().shinemonitorTimezone
    return (typeof tz === 'string' && tz.trim()) || DEFAULT_PLANT_TZ
  } catch {
    return DEFAULT_PLANT_TZ
  }
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(p => p.type === type)?.value ?? 0)

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second')
  }
}

/** Calendar date (YYYY-MM-DD) in the plant timezone — used for ShineMonitor `date` param. */
export function formatPlantDateYmd(date: Date, timeZone?: string): string {
  const tz = timeZone ?? getPlantTimeZone()
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

/** Calendar “today” for ShineMonitor `date=` (plant timezone). */
export function getPlantTodayRange(): { start: Date, dateYmd: string } {
  const dateYmd = formatPlantDateYmd(new Date())
  const start = parsePlantDateTimeString(`${dateYmd} 00:00:00`) ?? new Date()
  return { start, dateYmd }
}

function addDaysToPlantYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const noonUtc = Date.UTC(y!, m! - 1, d! + days, 12, 0, 0)
  return formatPlantDateYmd(new Date(noonUtc))
}

export type ShineHistoryRangeHours = 24 | 72

/** API `hours=72` means three plant calendar days (not a 72-hour rolling window). */
export function normalizeHistoryRangeHours(value: number): ShineHistoryRangeHours {
  return value === 72 ? 72 : 24
}

/** Plant dates to request from ShineMonitor (`queryDeviceDataOneDay` once per day). */
export function plantDaysForHistoryRange(range: ShineHistoryRangeHours): string[] {
  const today = formatPlantDateYmd(new Date())
  if (range === 72) {
    return [addDaysToPlantYmd(today, -2), addDaysToPlantYmd(today, -1), today]
  }
  return [addDaysToPlantYmd(today, -1), today]
}

/** Inclusive range start for charts; `rangeEnd` is always the latest sample timestamp. */
export function historyWindowStart(
  range: ShineHistoryRangeHours,
  rangeEndMs: number,
  fallback: Date
): Date {
  if (range === 72) {
    const oldestDay = plantDaysForHistoryRange(72)[0]
    return parsePlantDateTimeString(`${oldestDay} 00:00:00`) ?? fallback
  }
  return new Date(rangeEndMs - 24 * 60 * 60 * 1000)
}

/** Wall-clock time from ShineMonitor (no timezone) → UTC instant. */
export function plantWallClockToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): Date {
  const tz = getPlantTimeZone()
  let utc = Date.UTC(year, month - 1, day, hour, minute, second)

  for (let i = 0; i < 10; i++) {
    const p = zonedParts(new Date(utc), tz)
    if (
      p.year === year
      && p.month === month
      && p.day === day
      && p.hour === hour
      && p.minute === minute
      && Math.abs(p.second - second) <= 1
    ) {
      return new Date(utc)
    }

    utc
      += (year - p.year) * 31 * 86400000
        + (month - p.month) * 86400000
        + (day - p.day) * 86400000
        + (hour - p.hour) * 3600000
        + (minute - p.minute) * 60000
        + (second - p.second) * 1000
  }

  return new Date(utc)
}

/** Parse `YYYY-MM-DD HH:mm:ss` (or similar) as plant-local time. */
export function parsePlantDateTimeString(value: string): Date | null {
  const normalized = value.replace(/\s+/g, ' ').trim().replace(/\//g, '-')
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/
  )
  if (!match) {
    return null
  }

  return plantWallClockToDate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? '0')
  )
}
