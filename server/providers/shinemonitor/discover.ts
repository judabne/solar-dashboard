import {
  shineQueryCollectorDevices,
  shineQueryCollectors,
  shineQueryDeviceDataOneDay,
  shineQueryDevices,
  shineQueryPlants
} from './client'
import { deviceDataReachable } from './deviceData'
import { formatPlantDateYmd } from './dates'
import { shineMonitorBusinessVariants } from './variants'
import type { ShineMonitorBusinessRequestOptions, ShineMonitorDevice } from './types'

function deviceKey(device: ShineMonitorDevice): string {
  return `${device.pn}|${device.devcode}|${device.devaddr}|${device.sn}`
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
  return { pn, devcode, devaddr, sn, alias }
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
