<script setup lang="ts">
import { chartsScrollPaneKey, overviewScrollPaneKey } from '~/composables/mainTabScroll'

const viewport = ref<HTMLElement | null>(null)
const overviewScroll = ref<HTMLElement | null>(null)
const chartsScroll = ref<HTMLElement | null>(null)
const viewportWidth = ref(0)

provide(overviewScrollPaneKey, overviewScroll)
provide(chartsScrollPaneKey, chartsScroll)

const { activeIndex } = useMainTab()

const overviewScrollable = useScrollPaneOverflow(overviewScroll, { clampTouchWhenShort: true })
useScrollPaneOverflow(chartsScroll)

const {
  trackStyle,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel
} = useMainTabPager(viewportWidth)

let resizeObserver: ResizeObserver | null = null

function bindResizeObserver() {
  const el = viewport.value
  if (!el || resizeObserver) {
    return
  }
  const measure = () => {
    viewportWidth.value = el.clientWidth
  }
  measure()
  resizeObserver = new ResizeObserver(measure)
  resizeObserver.observe(el)
}

function unbindResizeObserver() {
  resizeObserver?.disconnect()
  resizeObserver = null
}

onMounted(bindResizeObserver)
onActivated(bindResizeObserver)
onDeactivated(unbindResizeObserver)
onUnmounted(unbindResizeObserver)
</script>

<template>
  <div
    ref="viewport"
    data-testid="main-tab-pager"
    class="h-full min-h-0 overflow-hidden"
    @touchstart.passive="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchCancel"
  >
    <div
      class="flex h-full min-h-0 w-[200%] will-change-transform"
      :style="trackStyle"
    >
      <div
        ref="overviewScroll"
        data-testid="overview-scroll-pane"
        class="h-full min-h-0 w-1/2 shrink-0 touch-pan-y overscroll-y-none"
        :class="[
          overviewScrollable ? 'overflow-y-auto' : 'overflow-y-hidden',
          activeIndex !== 0 && 'pointer-events-none'
        ]"
        :inert="activeIndex !== 0"
      >
        <OverviewTab v-if="activeIndex === 0" />
      </div>
      <div
        ref="chartsScroll"
        data-testid="charts-scroll-pane"
        class="h-full min-h-0 w-1/2 shrink-0 touch-pan-y overflow-y-auto overscroll-y-none"
        :class="activeIndex !== 1 && 'pointer-events-none'"
        :inert="activeIndex !== 1"
      >
        <ChartsTab v-if="activeIndex === 1" />
      </div>
    </div>
  </div>
</template>
