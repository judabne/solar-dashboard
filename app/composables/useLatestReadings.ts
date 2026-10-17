import type { NormalizedReadings } from '#shared/types/readings'
import { toDisplayMessage } from '~/utils/errors'

const REFRESH_MS = 2 * 60_000

const readings = ref<NormalizedReadings | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

let fetchInFlight = false
let refreshTimer: ReturnType<typeof setInterval> | null = null

export function useLatestReadings() {
  const api = useDashboardApi()

  async function refresh() {
    if (fetchInFlight) {
      return
    }
    fetchInFlight = true
    const isInitial = readings.value === null
    if (isInitial) {
      loading.value = true
    }
    error.value = null

    try {
      readings.value = await api.getLatest()
    } catch (e) {
      error.value = toDisplayMessage(e)
    } finally {
      loading.value = false
      fetchInFlight = false
    }
  }

  function tick() {
    if (document.hidden) {
      return
    }
    refresh()
  }

  function startTimer() {
    stopTimer()
    refreshTimer = setInterval(tick, REFRESH_MS)
  }

  function stopTimer() {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  onMounted(() => {
    if (readings.value === null) {
      refresh()
    }
    startTimer()
  })

  onActivated(() => {
    startTimer()
  })

  onDeactivated(() => {
    stopTimer()
  })

  onUnmounted(() => {
    stopTimer()
  })

  return {
    readings,
    loading,
    error,
    refresh
  }
}
