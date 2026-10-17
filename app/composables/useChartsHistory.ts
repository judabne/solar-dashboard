import type { HistoryResponse } from '#shared/types/readings'
import { toDisplayMessage } from '~/utils/errors'

const history = ref<HistoryResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const loadedRangeHours = ref<number | null>(null)

let fetchInFlight = false

export function useChartsHistory() {
  const api = useDashboardApi()

  async function loadHistory(rangeHours: number) {
    if (fetchInFlight) {
      return
    }
    fetchInFlight = true
    const isInitial = history.value === null
    if (isInitial) {
      loading.value = true
    }
    error.value = null

    const end = new Date()
    const start = new Date(end.getTime() - rangeHours * 60 * 60 * 1000)

    try {
      history.value = await api.getHistory(start.toISOString(), end.toISOString())
      loadedRangeHours.value = rangeHours
    } catch (e) {
      error.value = toDisplayMessage(e)
    } finally {
      loading.value = false
      fetchInFlight = false
    }
  }

  function ensureHistory(rangeHours: number) {
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
