import type { MainTabId } from '~/utils/mainTab'
import { MAIN_TAB_IDS } from '~/utils/mainTab'
import { shouldIgnoreTabGestureTarget } from '~/utils/touchGestures'

const LOCK_THRESHOLD_PX = 12
const COMMIT_FRACTION = 0.22
const COMMIT_MIN_PX = 56
const EDGE_OVERSCROLL_FRACTION = 0.25

export function useMainTabPager(viewportWidth: Ref<number>) {
  const route = useRoute()
  const { activeTab, activeIndex, setActiveTab } = useMainTab()

  const dragOffsetPx = ref(0)
  const dragging = ref(false)

  let startX = 0
  let startY = 0
  let tracking = false
  let axis: 'horizontal' | 'vertical' | null = null

  const trackStyle = computed(() => ({
    transform: `translate3d(calc(${-activeIndex.value * 50}% + ${dragOffsetPx.value}px), 0, 0)`,
    transition: dragging.value ? 'none' : 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)'
  }))

  function swipeEnabled() {
    return route.path === '/'
  }

  function clampDrag(dx: number, index: number): number {
    const width = viewportWidth.value
    const last = MAIN_TAB_IDS.length - 1
    if (width > 0) {
      const maxEdge = width * EDGE_OVERSCROLL_FRACTION
      if (index <= 0 && dx > 0) {
        return Math.min(dx, maxEdge)
      }
      if (index >= last && dx < 0) {
        return Math.max(dx, -maxEdge)
      }
    }
    return dx
  }

  function onTouchStart(event: TouchEvent) {
    if (!swipeEnabled() || shouldIgnoreTabGestureTarget(event)) {
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
    axis = null
    dragging.value = false
  }

  function onTouchMove(event: TouchEvent) {
    if (!tracking || !swipeEnabled()) {
      return
    }
    const touch = event.touches[0]
    if (!touch) {
      return
    }

    const dx = touch.clientX - startX
    const dy = touch.clientY - startY

    if (!axis) {
      if (Math.abs(dx) < LOCK_THRESHOLD_PX && Math.abs(dy) < LOCK_THRESHOLD_PX) {
        return
      }
      axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
    }

    if (axis === 'vertical') {
      return
    }

    dragging.value = true
    dragOffsetPx.value = clampDrag(dx, activeIndex.value)
    if (Math.abs(dragOffsetPx.value) > LOCK_THRESHOLD_PX) {
      event.preventDefault()
    }
  }

  function onTouchEnd() {
    if (!tracking) {
      return
    }
    tracking = false

    if (axis !== 'horizontal' || !swipeEnabled()) {
      dragOffsetPx.value = 0
      dragging.value = false
      axis = null
      return
    }

    const width = viewportWidth.value
    const offset = dragOffsetPx.value
    let nextIndex = activeIndex.value

    const commitThreshold = Math.max(COMMIT_MIN_PX, width * COMMIT_FRACTION)
    if (offset <= -commitThreshold && nextIndex < MAIN_TAB_IDS.length - 1) {
      nextIndex += 1
    } else if (offset >= commitThreshold && nextIndex > 0) {
      nextIndex -= 1
    }

    dragOffsetPx.value = 0
    dragging.value = false
    axis = null

    const nextTab = MAIN_TAB_IDS[nextIndex] as MainTabId
    if (nextTab !== activeTab.value) {
      setActiveTab(nextTab)
    }
  }

  function onTouchCancel() {
    tracking = false
    axis = null
    dragging.value = false
    dragOffsetPx.value = 0
  }

  return {
    trackStyle,
    dragging,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel
  }
}
