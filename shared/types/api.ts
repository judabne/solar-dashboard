import type { HistoryResponse, NormalizedReadings } from './readings'

export interface ApiErrorBody {
  code: string
  message: string
}

export interface ApiSuccess<T> {
  ok: true
  data: T
}

export interface ApiFailure {
  ok: false
  error: ApiErrorBody
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure

export interface DevicePairResponse {
  deviceId: string
  registered: boolean
}

export interface ProviderStatus {
  connected: boolean
  username: string | null
  needsReconnect: boolean
  available: boolean
  message: string | null
}

export interface ProvidersStatusResponse {
  shinemonitor: ProviderStatus
  batali: ProviderStatus
}

export type LatestReadingsResponse = NormalizedReadings
export type HistoryReadingsResponse = HistoryResponse
