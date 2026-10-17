import type { BatteryStatus, HistoryResponse, NormalizedReadings } from '#shared/types/readings'
import { fetchBataliLatest, getBataliStatus } from '../providers/batali'
import {
  fetchShineMonitorHistory,
  fetchShineMonitorLatest,
  getShineMonitorStatus
} from '../providers/shinemonitor/session'

const STALE_MS = 2 * 60 * 1000

export async function getLatestReadings(deviceId: string): Promise<NormalizedReadings> {
  const [shineStatus, shine, bataliStatus, batali] = await Promise.all([
    getShineMonitorStatus(deviceId),
    fetchShineMonitorLatest(deviceId),
    getBataliStatus(deviceId),
    fetchBataliLatest(deviceId)
  ])

  const inverterUpdatedAt = shine.readings?.inverterUpdatedAt ?? null
  const batteryUpdatedAt = batali.readings?.batteryUpdatedAt ?? null
  const stale = inverterUpdatedAt
    ? Date.now() - new Date(inverterUpdatedAt).getTime() > STALE_MS
    : true

  const bataliProviderError = batali.error
    ?? (!bataliStatus.available ? bataliStatus.message : null)

  return {
    inverterUpdatedAt,
    batteryUpdatedAt,
    stale,
    solarGenerationW: shine.readings?.solarGenerationW ?? null,
    gridPowerW: shine.readings?.gridPowerW ?? null,
    homeConsumptionW: shine.readings?.homeConsumptionW ?? null,
    batteryPercent: batali.readings?.batteryPercent ?? null,
    batteryStatus: (batali.readings?.batteryStatus ?? 'unknown') as BatteryStatus,
    workState: shine.readings?.workState ?? null,
    providers: {
      shinemonitor: {
        connected: shineStatus.connected && !shineStatus.needsReconnect,
        available: shineStatus.connected,
        error: shine.error
      },
      batali: {
        connected: bataliStatus.connected && !bataliStatus.needsReconnect,
        available: bataliStatus.available,
        error: bataliProviderError
      }
    }
  }
}

export async function getHistoryReadings(
  deviceId: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<HistoryResponse> {
  const [solar, grid, load] = await Promise.all([
    fetchShineMonitorHistory(deviceId, rangeStart, rangeEnd, 'solarGenerationW'),
    fetchShineMonitorHistory(deviceId, rangeStart, rangeEnd, 'gridPowerW'),
    fetchShineMonitorHistory(deviceId, rangeStart, rangeEnd, 'homeConsumptionW')
  ])

  return {
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    series: [
      {
        metric: 'solarGenerationW',
        label: 'Solar Generation',
        unit: 'W',
        available: solar.available,
        message: solar.message,
        points: solar.points
      },
      {
        metric: 'gridPowerW',
        label: 'Grid Power',
        unit: 'W',
        available: grid.available,
        message: grid.message,
        points: grid.points
      },
      {
        metric: 'homeConsumptionW',
        label: 'Home Consumption',
        unit: 'W',
        available: load.available,
        message: load.message,
        points: load.points
      },
      {
        metric: 'batteryPercent',
        label: 'Battery',
        unit: '%',
        available: false,
        message: 'Battery percentage requires a verified SoC source (Batali integration pending).',
        points: []
      }
    ]
  }
}
