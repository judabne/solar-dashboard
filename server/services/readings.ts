import type { BatteryStatus, HistoryResponse, NormalizedReadings } from '#shared/types/readings'
import { fetchBataliLatest, getBataliStatus } from '../providers/batali'
import type { ShineHistoryRangeHours } from '../providers/shinemonitor/dates'
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
  rangeHours: ShineHistoryRangeHours = 24
): Promise<HistoryResponse> {
  const shine = await fetchShineMonitorHistory(deviceId, rangeHours)

  return {
    rangeStart: shine.rangeStart.toISOString(),
    rangeEnd: shine.rangeEnd.toISOString(),
    series: [
      {
        metric: 'solarGenerationW',
        label: 'Solar Generation',
        unit: 'W',
        available: shine.available,
        message: shine.message,
        points: shine.points.solarGenerationW
      },
      {
        metric: 'gridPowerW',
        label: 'Grid Power',
        unit: 'W',
        available: shine.available,
        message: shine.message,
        points: shine.points.gridPowerW
      },
      {
        metric: 'homeConsumptionW',
        label: 'Home Consumption',
        unit: 'W',
        available: shine.available,
        message: shine.message,
        points: shine.points.homeConsumptionW
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
