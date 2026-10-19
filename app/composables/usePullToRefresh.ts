import { shouldIgnoreTabGestureTarget } from '~/utils/touchGestures'

const AXIS_LOCK_THRESHOLD_PX = 12

export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  scrollRoot?: Ref<HTMLElement | null | undefined>,
  when?: () => boolean
) {
  const route = useRoute()
  const { activeTab } = useMainTab()

  function pullEnabled() {
    if (route.path !== '/') {
      return false
    }
    if (when) {
      return when()
    }
    return activeTab.value === 'overview'
  }
  const pullDistance = ref(0)
  const pullActive = ref(false)

  const threshold = 64
  let startX = 0
  let startY = 0
  let tracking = false
  let axis: 'horizontal' | 'vertical' | null = null
  let boundEl: HTMLElement | null = null

  function atScrollTop() {
    const el = scrollRoot?.value
    if (el) {
      return el.scrollTop <= 0
    }
    return window.scrollY <= 0
  }

  function onTouchStart(event: TouchEvent) {
    axis = null
    if (!pullEnabled() || !atScrollTop() || pullActive.value) {
      tracking = false
      return
    }
    if (shouldIgnoreTabGestureTarget(event)) {
      tracking = false
      return
    }
    const touch = event.touches[0]
    if (!touch) {
      tracking = false
      return
    }
    startX = touch.clientX
    startY = touch.clientY
    tracking = true
  }

  function onTouchMove(event: TouchEvent) {
    if (!tracking || pullActive.value) {
      return
    }
    const touch = event.touches[0]
    if (!touch) {
      return
    }

    const dx = touch.clientX - startX
    const dy = touch.clientY - startY

    if (!axis) {
      if (Math.abs(dx) < AXIS_LOCK_THRESHOLD_PX && Math.abs(dy) < AXIS_LOCK_THRESHOLD_PX) {
        return
      }
      axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
    }

    if (axis === 'horizontal') {
      pullDistance.value = 0
      return
    }

    if (dy > 0 && atScrollTop()) {
      pullDistance.value = Math.min(dy * 0.45, threshold * 1.4)
      if (pullDistance.value > 8) {
        event.preventDefault()
      }
    } else {
      pullDistance.value = 0
    }
  }

  async function onTouchEnd() {
    if (!tracking) {
      return
    }
    tracking = false

    if (axis === 'horizontal') {
      pullDistance.value = 0
      axis = null
      return
    }
    axis = null

    if (pullDistance.value >= threshold && !pullActive.value) {
      pullActive.value = true
      try {
        await onRefresh()
      } finally {
        pullActive.value = false
      }
    }
    pullDistance.value = 0

    const el = scrollRoot?.value
    if (el && el.scrollHeight <= el.clientHeight + 1) {
      el.scrollTop = 0
    }
  }

  function bind(el: HTMLElement) {
    boundEl = el
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
  }

  function unbind(el: HTMLElement) {
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
    el.removeEventListener('touchcancel', onTouchEnd)
    if (boundEl === el) {
      boundEl = null
    }
  }

  watch(
    () => scrollRoot?.value,
    (el, _, onCleanup) => {
      if (!el) {
        return
      }
      bind(el)
      onCleanup(() => unbind(el))
    },
    { immediate: true }
  )

  function detach() {
    if (boundEl) {
      unbind(boundEl)
    }
  }

  onDeactivated(detach)
  onUnmounted(detach)

  const pullLabel = computed(() => {
    if (pullActive.value) {
      return 'Refreshing…'
    }
    if (pullDistance.value >= threshold) {
      return 'Release to refresh'
    }
    if (pullDistance.value > 0) {
      return 'Pull to refresh'
    }
    return ''
  })

  return {
    pullDistance,
    pullActive,
    pullLabel,
    threshold
  }
}
