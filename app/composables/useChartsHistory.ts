import type { HistoryResponse } from '#shared/types/readings'
import { toDisplayMessage } from '~/utils/errors'

export type ChartHistoryRangeHours = 24 | 72

const history = ref<HistoryResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const loadedRangeHours = ref<ChartHistoryRangeHours | null>(null)

let fetchInFlight = false

export function useChartsHistory() {
  const api = useDashboardApi()

  async function loadHistory(rangeHours: ChartHistoryRangeHours): Promise<void> {
    if (fetchInFlight) {
      return
    }
    fetchInFlight = true
    const isInitial = history.value === null
    if (isInitial) {
      loading.value = true
    }
    error.value = null

    try {
      history.value = await api.getHistory(rangeHours)
      loadedRangeHours.value = rangeHours
    } catch (e) {
      error.value = toDisplayMessage(e)
    } finally {
      loading.value = false
      fetchInFlight = false
    }
  }

  function ensureHistory(rangeHours: ChartHistoryRangeHours) {
    if (history.value !== null && loadedRangeHours.value === rangeHours) {
      return
    }
    loadHistory(rangeHours)
  }

  return {
    history,
    loading,
    error,
    loadHistory,
    ensureHistory
  }
}
