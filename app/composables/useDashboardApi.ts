import type {
  ApiResult,
  HistoryReadingsResponse,
  LatestReadingsResponse,
  ProvidersStatusResponse
} from '#shared/types/api'
import { isApiFailure, parseApiResult, providerAuthMessage } from '~/utils/apiClient'
import { toDisplayMessage } from '~/utils/errors'

export function useDashboardApi() {
  const { getAuthHeaders, ensurePaired, pairingReady } = useDeviceAuth()

  async function apiFetch<T>(path: string, options: Parameters<typeof $fetch>[1] = {}) {
    if (!pairingReady.value) {
      await ensurePaired()
    }

    try {
      const result = await $fetch<ApiResult<T>>(path, {
        ...options,
        ignoreResponseError: true,
        headers: {
          ...getAuthHeaders(),
          ...(options.headers as Record<string, string> | undefined)
        }
      })

      return parseApiResult(result)
    } catch (error) {
      if (isApiFailure(error)) {
        throw new Error(providerAuthMessage(error.code, error.message), { cause: error })
      }

      const message = toDisplayMessage(error)
      if (message) {
        throw new Error(message, { cause: error })
      }
      throw new Error('Request failed', { cause: error })
    }
  }

  return {
    getLatest: () => apiFetch<LatestReadingsResponse>('/api/readings/latest'),
    getHistory: (start: string, end: string) =>
      apiFetch<HistoryReadingsResponse>('/api/readings/history', { query: { start, end } }),
    getProviderStatus: () => apiFetch<ProvidersStatusResponse>('/api/providers/status'),
    connectShineMonitor: (username: string, password: string) =>
      apiFetch<{ connected: boolean }>('/api/providers/shinemonitor/connect', {
        method: 'POST',
        body: { username, password }
      }),
    disconnectShineMonitor: () =>
      apiFetch<{ connected: boolean }>('/api/providers/shinemonitor/disconnect', { method: 'POST' }),
    connectBatali: (username: string, password: string) =>
      apiFetch<{ connected: boolean }>('/api/providers/batali/connect', {
        method: 'POST',
        body: { username, password }
      }),
    disconnectBatali: () =>
      apiFetch<{ connected: boolean }>('/api/providers/batali/disconnect', { method: 'POST' })
  }
}
