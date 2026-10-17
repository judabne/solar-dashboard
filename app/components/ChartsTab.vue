<script setup lang="ts">
import type { HistoryResponse } from '#shared/types/readings'
import { chartsScrollPaneKey } from '~/composables/mainTabScroll'
import { dashboardSurfaceBorder } from '~/utils/dashboardSurface'
import { METRIC_COLORS } from '~/utils/metricColors'

const rangeHours = ref<24 | 72>(24)
const { activeTab } = useMainTab()
const { history, loading, error, loadHistory, ensureHistory } = useChartsHistory()
const chartsScroll = inject(chartsScrollPaneKey)

async function refreshCharts() {
  await loadHistory(rangeHours.value)
}

const { pullDistance, pullActive, pullLabel, threshold } = usePullToRefresh(
  refreshCharts,
  chartsScroll,
  () => activeTab.value === 'charts'
)

const rangeOptions = [
  { label: '24 hours', value: 24 as const },
  { label: '3 days', value: 72 as const }
]

function toChartPoints(series?: HistoryResponse['series'][number]) {
  return (series?.points ?? []).map(p => ({
    x: new Date(p.timestamp).getTime(),
    y: p.value
  }))
}

watch(rangeHours, (hours) => {
  if (activeTab.value === 'charts') {
    loadHistory(hours)
  }
})

watch(activeTab, (tab) => {
  if (tab === 'charts') {
    ensureHistory(rangeHours.value)
  }
})

const solarSeries = computed(() => history.value?.series.find(s => s.metric === 'solarGenerationW'))
const gridSeries = computed(() => history.value?.series.find(s => s.metric === 'gridPowerW'))
const loadSeries = computed(() => history.value?.series.find(s => s.metric === 'homeConsumptionW'))
</script>

<template>
  <div
    class="page-shell space-y-4 md:space-y-5"
    data-testid="charts-tab"
  >
    <div
      data-testid="pull-refresh-indicator"
      class="flex items-center justify-center overflow-hidden text-xs text-muted transition-[height,opacity] duration-150"
      :style="{
        height: pullDistance > 0 || pullActive ? '2rem' : '0',
        opacity: pullDistance > 0 || pullActive ? 1 : 0
      }"
      aria-live="polite"
    >
      <span v-if="pullActive">Refreshing…</span>
      <span v-else-if="pullLabel">{{ pullLabel }}</span>
      <span
        v-else-if="pullDistance > 0"
        class="inline-block transition-transform"
        :style="{ transform: `rotate(${Math.min(pullDistance / threshold, 1) * 180}deg)` }"
      >
        <UIcon
          name="i-lucide-arrow-down"
          class="size-4"
        />
      </span>
    </div>

    <header class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">
          Charts
        </h1>
      </div>
      <div
        class="flex shrink-0 items-center gap-0.5"
        @touchstart.stop
        @touchend.stop
      >
        <ColorModeToggle />
        <UButton
          to="/settings"
          icon="i-lucide-settings"
          color="neutral"
          variant="ghost"
          aria-label="Settings"
          data-testid="settings-link"
        />
      </div>
    </header>

    <USelect
      v-model="rangeHours"
      data-testid="charts-range"
      :items="rangeOptions"
      value-key="value"
      label-key="label"
      class="w-full"
      :ui="{
        base: `${dashboardSurfaceBorder} w-full`,
        content: `${dashboardSurfaceBorder} bg-default shadow-lg overflow-hidden`
      }"
    />

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      :title="error"
    />

    <div
      v-if="loading || !history"
      class="space-y-4"
    >
      <USkeleton class="h-64 w-full" />
      <USkeleton class="h-64 w-full" />
      <USkeleton class="h-64 w-full" />
      <USkeleton class="h-64 w-full" />
    </div>

    <template v-else-if="history">
      <div class="grid gap-4 md:grid-cols-2 md:gap-5">
        <TimeSeriesChart
          title="Solar Generation"
          unit="W"
          :points="toChartPoints(solarSeries)"
          :line-color="METRIC_COLORS.solar.line"
          :fill-color="METRIC_COLORS.solar.fill"
        />
        <TimeSeriesChart
          title="Grid Power"
          unit="W"
          :points="toChartPoints(gridSeries)"
          :show-zero-baseline="true"
          :line-color="METRIC_COLORS.grid.line"
          :fill-color="METRIC_COLORS.grid.fill"
        />
        <TimeSeriesChart
          title="Home Consumption"
          unit="W"
          :points="toChartPoints(loadSeries)"
          :comparison-points="toChartPoints(solarSeries)"
          compare-consumption
        />
        <TimeSeriesChart
          title="Battery"
          unit="%"
          :points="[]"
          :line-color="METRIC_COLORS.battery.line"
          :fill-color="METRIC_COLORS.battery.fill"
        />
      </div>
    </template>
  </div>
</template>
