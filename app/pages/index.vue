<script setup lang="ts">
import { formatWatts, formatPercent, formatTimestamp } from '~/utils/format'

definePageMeta({ layout: 'default', keepalive: true })

const { readings, loading, error, refresh } = useLatestReadings()
const { pullDistance, pullActive, pullLabel, threshold } = usePullToRefresh(refresh)

const statusTone = computed(() => {
  if (error.value) return 'error'
  return 'default'
})

const gridPowerValueClass = computed(() => {
  const grid = readings.value?.gridPowerW
  const solar = readings.value?.solarGenerationW
  if (grid === null || grid === undefined || solar === null || solar === undefined) {
    return ''
  }
  return grid > solar ? 'text-red-600' : 'text-green-600'
})

const batteryValue = computed(() => {
  const pct = readings.value?.batteryPercent
  if (pct === null || pct === undefined) {
    return '—'
  }
  return formatPercent(pct)
})
</script>

<template>
  <div class="page-shell">
    <div
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
        <UIcon name="i-lucide-arrow-down" class="size-4" />
      </span>
    </div>

    <header class="mb-4 flex items-center justify-between gap-3">
      <h1 class="text-xl font-semibold tracking-tight">
        Solar Dashboard
      </h1>
      <UButton
        to="/settings"
        icon="i-lucide-settings"
        color="neutral"
        variant="ghost"
        aria-label="Settings"
      />
    </header>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      class="mb-4"
      :title="error"
    />

    <div class="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      <MetricCard
        title="Solar Generation"
        :value="formatWatts(readings?.solarGenerationW)"
        :loading="loading"
        :tone="statusTone"
      />
      <MetricCard
        title="Grid Power"
        :value="formatWatts(readings?.gridPowerW)"
        :loading="loading"
        :tone="statusTone"
        :value-class="gridPowerValueClass"
      />
      <MetricCard
        title="Home Consumption"
        :value="formatWatts(readings?.homeConsumptionW)"
        :loading="loading"
        :tone="statusTone"
      />
      <MetricCard
        title="Battery"
        :value="batteryValue"
        :loading="loading"
      >
        <template #subtitle>
          <div v-if="!loading" class="mt-2">
            <BatteryStatusIndicator :status="readings?.batteryStatus ?? 'unknown'" />
          </div>
        </template>
      </MetricCard>
    </div>

    <div
      v-if="!loading"
      class="mt-4 space-y-0.5 text-center text-xs text-muted md:text-left"
    >
      <p>
        Inverter:
        <time
          v-if="readings?.inverterUpdatedAt"
          :datetime="readings.inverterUpdatedAt"
        >{{ formatTimestamp(readings.inverterUpdatedAt) }}</time>
        <span v-else>—</span>
        <span v-if="readings?.stale" class="text-warning"> · may be stale</span>
      </p>
      <p>
        Battery:
        <time
          v-if="readings?.batteryUpdatedAt"
          :datetime="readings.batteryUpdatedAt"
        >{{ formatTimestamp(readings.batteryUpdatedAt) }}</time>
        <span v-else>—</span>
      </p>
    </div>
  </div>
</template>
