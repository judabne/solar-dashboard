export type BatteryStatus = 'charging' | 'discharging' | 'idle' | 'unknown'

export type ProviderId = 'shinemonitor' | 'batali'

export interface ProviderSourceMeta {
  connected: boolean
  available: boolean
  error: string | null
}

export interface NormalizedReadings {
  inverterUpdatedAt: string | null
  batteryUpdatedAt: string | null
  stale: boolean
  solarGenerationW: number | null
  gridPowerW: number | null
  homeConsumptionW: number | null
  batteryPercent: number | null
  batteryStatus: BatteryStatus
  workState: string | null
  providers: Record<ProviderId, ProviderSourceMeta>
}

export interface HistoryPoint {
  timestamp: string
  value: number | null
}

export interface HistorySeries {
  metric: 'solarGenerationW' | 'gridPowerW' | 'homeConsumptionW' | 'batteryPercent'
  label: string
  unit: string
  available: boolean
  message: string | null
  points: HistoryPoint[]
}

export interface HistoryResponse {
  rangeStart: string
  rangeEnd: string
  series: HistorySeries[]
}
