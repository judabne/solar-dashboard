<script setup lang="ts">
import { chartsScrollPaneKey, overviewScrollPaneKey } from '~/composables/mainTabScroll'

const viewport = ref<HTMLElement | null>(null)
const overviewScroll = ref<HTMLElement | null>(null)
const chartsScroll = ref<HTMLElement | null>(null)
const viewportWidth = ref(0)

provide(overviewScrollPaneKey, overviewScroll)
provide(chartsScrollPaneKey, chartsScroll)

const { activeIndex } = useMainTab()

const {
  trackStyle,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel
} = useMainTabPager(viewportWidth)

onMounted(() => {
  const el = viewport.value
  if (!el) {
    return
  }
  const measure = () => {
    viewportWidth.value = el.clientWidth
  }
  measure()
  const observer = new ResizeObserver(measure)
  observer.observe(el)
  onUnmounted(() => observer.disconnect())
})
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
      class="flex h-full w-[200%] will-change-transform"
      :style="trackStyle"
    >
      <div
        ref="overviewScroll"
        data-testid="overview-scroll-pane"
        class="h-full w-1/2 shrink-0 touch-pan-y overflow-y-auto overscroll-y-contain"
        :class="activeIndex !== 0 && 'pointer-events-none'"
        :inert="activeIndex !== 0"
      >
        <KeepAlive>
          <OverviewTab />
        </KeepAlive>
      </div>
      <div
        ref="chartsScroll"
        data-testid="charts-scroll-pane"
        class="h-full w-1/2 shrink-0 touch-pan-y overflow-y-auto overscroll-y-contain"
        :class="activeIndex !== 1 && 'pointer-events-none'"
        :inert="activeIndex !== 1"
      >
        <KeepAlive>
          <ChartsTab />
        </KeepAlive>
      </div>
    </div>
  </div>
</template>
