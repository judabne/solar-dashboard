import { shineQueryPlantDeviceDesignatedInformation } from './client'
import { shineMonitorBusinessVariants } from './variants'

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function normalizeParamKey(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function energyTodayFromRecord(record: Record<string, unknown>): number | null {
  const direct = parseNumber(
    record.energy_today
    ?? record.energyToday
    ?? record['energy today']
    ?? record.eToday
    ?? record.eday
  )
  if (direct !== null) {
    return direct
  }

  for (const [key, value] of Object.entries(record)) {
    if (!normalizeParamKey(key).includes('energy_today')) {
      continue
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = parseNumber(
        (value as Record<string, unknown>).value
        ?? (value as Record<string, unknown>).val
        ?? (value as Record<string, unknown>).data
      )
      if (nested !== null) {
        return nested
      }
    }
    const scalar = parseNumber(value)
    if (scalar !== null) {
      return scalar
    }
  }

  const list = record.list ?? record.parameter ?? record.rows ?? record.data ?? record.device
  if (Array.isArray(list)) {
    for (const entry of list) {
      const parsed = parseDesignatedEnergyToday(entry)
      if (parsed !== null) {
        return parsed
      }
    }
  }

  for (const value of Object.values(record)) {
    if (!value || typeof value !== 'object') {
      continue
    }
    const nested = parseDesignatedEnergyToday(value)
    if (nested !== null) {
      return nested
    }
  }

  return null
}

/** `queryPlantDeviceDesignatedInformation` with `parameter=energy_today` (kWh). */
export function parseDesignatedEnergyToday(dat: unknown): number | null {
  if (dat === null || dat === undefined) {
    return null
  }
  if (Array.isArray(dat)) {
    for (const entry of dat) {
      const parsed = parseDesignatedEnergyToday(entry)
      if (parsed !== null) {
        return parsed
      }
    }
    return null
  }
  if (typeof dat !== 'object') {
    return parseNumber(dat)
  }
  return energyTodayFromRecord(dat as Record<string, unknown>)
}

export async function fetchPlantEnergyTodayKwh(
  token: string,
  secret: string,
  plantId: string,
  devtype: string | number
): Promise<number | null> {
  for (const variant of shineMonitorBusinessVariants()) {
    try {
      const body = await shineQueryPlantDeviceDesignatedInformation(
        token,
        secret,
        {
          plantid: plantId,
          devtype,
          parameter: 'energy_today,energy_total'
        },
        variant
      )
      if (body.err !== 0) {
        continue
      }
      const parsed = parseDesignatedEnergyToday(body.dat)
      if (parsed !== null) {
        return parsed
      }
    } catch {
      // try next host / signing style
    }
  }
  return null
}
