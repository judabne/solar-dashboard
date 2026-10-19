<script setup lang="ts">
import { overviewScrollPaneKey } from '~/composables/mainTabScroll'
import { isClient } from '~/utils/clientOnly'
import { formatKilowattHours, formatWatts, formatPercent, formatReadingTimestamp } from '~/utils/format'

const { activeTab } = useMainTab()
const { readings, loading, error, refresh } = useLatestReadings()
const overviewScroll = inject(overviewScrollPaneKey)

if (isClient()) {
  watch(
    () => activeTab.value,
    (tab) => {
      if (tab !== 'overview') {
        return
      }
      if (
        readings.value === null
        || (
          readings.value.inverterUpdatedAt === null
          && readings.value.homeConsumptionW === null
          && readings.value.solarGenerationW === null
        )
      ) {
        refresh()
      }
    }
  )
}
const { pullDistance, pullActive, pullLabel, threshold } = usePullToRefresh(refresh, overviewScroll)

const statusTone = computed(() => {
  if (error.value) return 'error'
  return 'default'
})

const homeConsumptionValueClass = computed(() => {
  if (error.value) {
    return ''
  }
  const home = readings.value?.homeConsumptionW
  const solar = readings.value?.solarGenerationW
  if (home === null || home === undefined || solar === null || solar === undefined) {
    return ''
  }
  return home > solar ? 'text-[#dc2626]' : ''
})

const batteryValue = computed(() => {
  const pct = readings.value?.batteryPercent
  if (pct === null || pct === undefined) {
    return 'Soon'
  }
  return formatPercent(pct)
})
</script>

<template>
  <div
    class="page-shell"
    data-testid="overview-tab"
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

    <header class="mb-5 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-bold tracking-tight">
        Solar Dashboard
      </h1>
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
        icon="i-lucide-sun"
        icon-class="text-orange-500"
        :value="formatWatts(readings?.solarGenerationW)"
        :loading="loading"
        :tone="statusTone"
      >
        <template #subtitle>
          <p
            v-if="!loading"
            class="text-sm text-muted"
          >
            Today: {{ formatKilowattHours(readings?.solarGeneratedTodayKwh) }}
          </p>
        </template>
      </MetricCard>
      <MetricCard
        title="Grid Power"
        icon="i-lucide-zap"
        icon-class="text-blue-500"
        :value="formatWatts(readings?.gridPowerW)"
        :loading="loading"
        :tone="statusTone"
      />
      <MetricCard
        title="Home Consumption"
        icon="i-lucide-house"
        icon-class="text-green-600"
        :value="formatWatts(readings?.homeConsumptionW)"
        :loading="loading"
        :tone="statusTone"
        :value-class="homeConsumptionValueClass"
      />
      <MetricCard
        title="Battery"
        icon="i-lucide-battery-charging"
        icon-class="text-rose-500"
        :value="batteryValue"
        :loading="loading"
      >
        <template #subtitle>
          <div
            v-if="!loading"
            class="mt-2"
          >
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
        >{{ formatReadingTimestamp(readings.inverterUpdatedAt) }}</time>
        <span v-else>—</span>
      </p>
      <p>
        Battery:
        <time
          v-if="readings?.batteryUpdatedAt"
          :datetime="readings.batteryUpdatedAt"
        >{{ formatReadingTimestamp(readings.batteryUpdatedAt) }}</time>
        <span v-else>—</span>
      </p>
    </div>
  </div>
</template>
