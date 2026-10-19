import type { NormalizedReadings } from '#shared/types/readings'
import { isClient } from '~/utils/clientOnly'
import { toDisplayMessage } from '~/utils/errors'

const REFRESH_MS = 2 * 60_000

const readings = ref<NormalizedReadings | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

let fetchInFlight = false
let refreshTimer: ReturnType<typeof setInterval> | null = null
let timerTick: (() => void) | null = null

/** Re-bind the polling interval (e.g. after switching to fake timers in tests). */
export function restartLatestReadingsPolling() {
  if (!isClient() || !timerTick) {
    return
  }
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  refreshTimer = setInterval(timerTick, REFRESH_MS)
}

type UseLatestReadingsOptions = {
  /** Start interval + fetch when the home page mounts (call once from `pages/index.vue`). */
  poll?: boolean
}

export function useLatestReadings(options: UseLatestReadingsOptions = {}) {
  const route = useRoute()
  const api = useDashboardApi()

  async function refresh() {
    if (!isClient() || fetchInFlight) {
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
    if (document.hidden || route.path !== '/') {
      return
    }
    refresh()
  }
  timerTick = tick

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

  function resumeHomePolling() {
    if (route.path !== '/') {
      return
    }
    void refresh()
    startTimer()
  }

  if (isClient() && options.poll) {
    onMounted(() => {
      resumeHomePolling()
    })

    onUnmounted(() => {
      stopTimer()
    })

    watch(
      () => route.path,
      (path) => {
        if (path === '/') {
          resumeHomePolling()
        } else {
          stopTimer()
        }
      }
    )
  }

  return {
    readings,
    loading,
    error,
    refresh
  }
}
