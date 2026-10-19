import {
  shineQueryCollectorDevices,
  shineQueryCollectors,
  shineQueryDeviceDataOneDay,
  shineQueryDevices,
  shineQueryPlants
} from './client'
import { deviceDataReachable } from './deviceData'
import { resolveShineMonitorConfig } from './config'
import { formatPlantDateYmd } from './dates'
import { shineMonitorBusinessVariants } from './variants'
import type { ShineMonitorBusinessRequestOptions, ShineMonitorDevice } from './types'

function keyPart(value: string | number): string {
  return String(value).trim().toUpperCase()
}

export function deviceKey(device: ShineMonitorDevice): string {
  return `${keyPart(device.pn)}|${keyPart(device.devcode)}|${keyPart(device.devaddr)}|${keyPart(device.sn)}`
}

function plantIdFromRow(raw: Record<string, unknown>): string | null {
  const pid = raw.plantid ?? raw.plantId ?? raw.plant_id ?? raw.pid
  if (pid === null || pid === undefined || pid === '') {
    return null
  }
  return String(pid)
}

async function findPlantIdForDevice(
  token: string,
  secret: string,
  device: ShineMonitorDevice,
  options: ShineMonitorBusinessRequestOptions
): Promise<string | null> {
  const targetKey = deviceKey(device)

  const globalRows = await shineQueryDevices(token, secret, options)
  for (const row of globalRows) {
    const raw = row as Record<string, unknown>
    const mapped = mapRawDevice(raw)
    if (mapped && deviceKey(mapped) === targetKey) {
      const fromRow = plantIdFromRow(raw)
      if (fromRow) {
        return fromRow
      }
    }
  }

  const plants = await shineQueryPlants(token, secret, options)
  for (const plant of plants) {
    const plantid = String(plant.pid ?? plant.plantid ?? '')
    if (!plantid) {
      continue
    }

    const rows = await shineQueryDevices(token, secret, { ...options, plantid })
    for (const row of rows) {
      const mapped = mapRawDevice(row as Record<string, unknown>)
      if (mapped && deviceKey(mapped) === targetKey) {
        return plantid
      }
    }

    const collectors = await shineQueryCollectors(token, secret, { plantid, options })
    for (const collector of collectors) {
      const pn = String(collector.pn ?? '')
      if (!pn) {
        continue
      }
      const devs = await shineQueryCollectorDevices(token, secret, pn, options)
      for (const row of devs) {
        const mapped = mapRawDevice(row as Record<string, unknown>, pn)
        if (mapped && deviceKey(mapped) === targetKey) {
          return plantid
        }
      }
    }
  }

  return null
}

export function mapRawDevice(
  raw: Record<string, unknown>,
  collectorPn?: string
): ShineMonitorDevice | null {
  const pn = String(raw.pn ?? collectorPn ?? raw.PN ?? '')
  const devcode = String(raw.devcode ?? raw.devCode ?? '')
  const devaddr = String(raw.devaddr ?? raw.devAddr ?? '')
  const sn = String(raw.sn ?? raw.SN ?? raw.devSn ?? '')
  if (!pn || !devcode || !devaddr || !sn) {
    return null
  }
  const alias = raw.alias ? String(raw.alias) : undefined
  const devtypeRaw = raw.devtype ?? raw.devType ?? raw.type ?? raw.device_type ?? raw.dType
  const devtype = devtypeRaw != null && devtypeRaw !== ''
    ? String(devtypeRaw)
    : undefined
  return {
    pn,
    devcode,
    devaddr,
    sn,
    alias,
    ...(devtype ? { devtype } : {})
  }
}

function addDevices(
  target: Map<string, ShineMonitorDevice>,
  rows: Array<Record<string, unknown>>,
  collectorPn?: string
) {
  for (const row of rows) {
    const mapped = mapRawDevice(row, collectorPn)
    if (mapped) {
      target.set(deviceKey(mapped), mapped)
    }
  }
}

async function discoverWithSigningVariant(
  token: string,
  secret: string,
  options: ShineMonitorBusinessRequestOptions,
  found: Map<string, ShineMonitorDevice>
) {
  const devices = await shineQueryDevices(token, secret, options)
  addDevices(found, devices as Array<Record<string, unknown>>)

  const plants = await shineQueryPlants(token, secret, options)
  const plantIds = new Set<string>()
  for (const plant of plants) {
    const pid = String(plant.pid ?? plant.plantid ?? '')
    if (pid) {
      plantIds.add(pid)
    }
  }

  const collectorsByPn = new Map<string, string>()
  const collectorsGlobal = await shineQueryCollectors(token, secret, { options })
  for (const collector of collectorsGlobal) {
    const pn = String(collector.pn ?? '')
    if (pn) {
      collectorsByPn.set(pn, pn)
    }
  }

  for (const plantid of plantIds) {
    const collectors = await shineQueryCollectors(token, secret, { plantid, options })
    for (const collector of collectors) {
      const pn = String(collector.pn ?? '')
      if (pn) {
        collectorsByPn.set(pn, pn)
      }
    }
    const plantDevices = await shineQueryDevices(token, secret, { ...options, plantid })
    addDevices(found, plantDevices as Array<Record<string, unknown>>)
  }

  for (const pn of collectorsByPn.keys()) {
    const devs = await shineQueryCollectorDevices(token, secret, pn, options)
    addDevices(found, devs as Array<Record<string, unknown>>, pn)
  }
}

export async function shineDiscoverDevices(token: string, secret: string): Promise<ShineMonitorDevice[]> {
  const found = new Map<string, ShineMonitorDevice>()

  for (const variant of shineMonitorBusinessVariants()) {
    try {
      await discoverWithSigningVariant(token, secret, variant, found)
    } catch {
      // Keep trying other hosts / signing styles.
    }
  }

  return [...found.values()]
}

function orderDevicesForValidation(
  devices: ShineMonitorDevice[],
  previous?: ShineMonitorDevice | null
): ShineMonitorDevice[] {
  if (!previous) {
    return devices
  }
  const preferred = pickPrimaryInverter(devices, previous)
  if (!preferred) {
    return devices
  }
  const key = deviceKey(preferred)
  return [
    preferred,
    ...devices.filter(d => deviceKey(d) !== key)
  ]
}

export async function shineResolveValidatedDevice(
  token: string,
  secret: string,
  previous?: ShineMonitorDevice | null
): Promise<ShineMonitorDevice | null> {
  const discovered = await shineDiscoverDevices(token, secret)
  const candidates = orderDevicesForValidation(discovered, previous)
  if (!candidates.length) {
    return null
  }

  const today = formatPlantDateYmd(new Date())
  for (const device of candidates) {
    const probe = await shineQueryDeviceDataOneDay(token, secret, {
      pn: device.pn,
      devcode: String(device.devcode),
      devaddr: String(device.devaddr),
      sn: device.sn,
      date: today
    })
    if (deviceDataReachable(probe)) {
      return device
    }
  }

  return null
}

/** `devtype` for `queryPlantDeviceDesignatedInformation` (distinct from `devcode`). */
export async function enrichDeviceForPlant(
  token: string,
  secret: string,
  plantId: string,
  device: ShineMonitorDevice
): Promise<ShineMonitorDevice> {
  if (device.devtype !== undefined && device.devtype !== '') {
    return device
  }

  const rows = await shineQueryDevices(token, secret, { plantid: plantId })
  for (const row of rows) {
    const mapped = mapRawDevice(row as Record<string, unknown>)
    if (mapped && deviceKey(mapped) === deviceKey(device) && mapped.devtype) {
      return { ...device, devtype: mapped.devtype }
    }
  }

  const fromPlant = await shineListDevicesForPlant(token, secret, plantId)
  const match = fromPlant.find(d => deviceKey(d) === deviceKey(device))
  if (match?.devtype !== undefined && match.devtype !== '') {
    return { ...device, devtype: match.devtype }
  }

  try {
    const collectorDevs = await shineQueryCollectorDevices(token, secret, device.pn)
    for (const row of collectorDevs) {
      const mapped = mapRawDevice(row as Record<string, unknown>, device.pn)
      if (mapped && deviceKey(mapped) === deviceKey(device) && mapped.devtype) {
        return { ...device, devtype: mapped.devtype }
      }
    }
  } catch {
    // collector list optional
  }

  // Portal `queryPlantDeviceDesignatedInformation` uses category 512 for storage plants (`source=1`).
  if (resolveShineMonitorConfig().source === '1') {
    return { ...device, devtype: '512' }
  }

  return device
}

export async function shineResolvePlantIdForDevice(
  token: string,
  secret: string,
  device: ShineMonitorDevice
): Promise<string | null> {
  for (const variant of shineMonitorBusinessVariants()) {
    try {
      const plantId = await findPlantIdForDevice(token, secret, device, variant)
      if (plantId) {
        return plantId
      }
    } catch {
      // try next signing variant
    }
  }

  return null
}

export async function shineListDevicesForPlant(
  token: string,
  secret: string,
  plantid: string
): Promise<ShineMonitorDevice[]> {
  const found = new Map<string, ShineMonitorDevice>()

  for (const variant of shineMonitorBusinessVariants()) {
    try {
      const rows = await shineQueryDevices(token, secret, { ...variant, plantid })
      addDevices(found, rows as Array<Record<string, unknown>>)
      if (found.size) {
        break
      }
    } catch {
      // try next variant
    }
  }

  return [...found.values()]
}

export function pickPrimaryInverter(
  devices: ShineMonitorDevice[],
  previous?: ShineMonitorDevice | null
): ShineMonitorDevice | null {
  if (!devices.length) {
    return null
  }

  if (previous) {
    const key = deviceKey(previous)
    const match = devices.find(d => deviceKey(d) === key)
    if (match) {
      return match
    }
  }

  return devices[0] ?? null
}
