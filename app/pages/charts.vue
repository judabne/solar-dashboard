<script setup lang="ts">
import type { HistoryResponse } from '#shared/types/readings'
import { METRIC_COLORS } from '~/utils/metricColors'

definePageMeta({ layout: 'default', keepalive: true })

const rangeHours = ref<24 | 72>(24)
const { history, loading, error, loadHistory, ensureHistory } = useChartsHistory()

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
  loadHistory(hours)
})

onMounted(() => {
  ensureHistory(rangeHours.value)
})

const solarSeries = computed(() => history.value?.series.find(s => s.metric === 'solarGenerationW'))
const gridSeries = computed(() => history.value?.series.find(s => s.metric === 'gridPowerW'))
const loadSeries = computed(() => history.value?.series.find(s => s.metric === 'homeConsumptionW'))
</script>

<template>
  <div class="page-shell space-y-4 md:space-y-5">
    <header class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">
          Charts
        </h1>
      </div>
      <div class="flex shrink-0 items-center gap-0.5">
        <ColorModeToggle />
        <UButton
          to="/settings"
          icon="i-lucide-settings"
          color="neutral"
          variant="ghost"
          aria-label="Settings"
        />
      </div>
    </header>

    <USelect
      v-model="rangeHours"
      :items="rangeOptions"
      value-key="value"
      label-key="label"
      class="w-full"
      :ui="{
        base: 'dashboard-border !ring-0 w-full',
        content: 'dashboard-border !ring-0 bg-default shadow-lg overflow-hidden'
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
