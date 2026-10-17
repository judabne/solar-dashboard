<script setup lang="ts">
import { dashboardSurfaceBorder } from '~/utils/dashboardSurface'
import { METRIC_COLORS } from '~/utils/metricColors'
import {
  Chart,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  LineController,
  CategoryScale
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import 'chartjs-adapter-date-fns'
import { Line } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
)

const props = withDefaults(
  defineProps<{
    title: string
    unit: string
    points: Array<{ x: number, y: number | null }>
    comparisonPoints?: Array<{ x: number, y: number | null }>
    compareConsumption?: boolean
    showZeroBaseline?: boolean
    unavailableMessage?: string | null
    lineColor?: string
    fillColor?: string
  }>(),
  {
    lineColor: METRIC_COLORS.solar.line,
    fillColor: METRIC_COLORS.solar.fill
  }
)

const chartRef = ref<{ chart?: Chart } | null>(null)

/** Touch devices: tooltip on tap only so vertical scroll does not scrub the chart. */
const isCoarsePointer = ref(window.matchMedia('(pointer: coarse)').matches)

onMounted(() => {
  const mq = window.matchMedia('(pointer: coarse)')
  mq.addEventListener('change', (e) => {
    isCoarsePointer.value = e.matches
  })
})

const chartEventsCoarse: ChartOptions<'line'>['events'] = ['click', 'mouseout']
const chartEventsFine: ChartOptions<'line'>['events'] = ['mousemove', 'mouseout', 'click']

const chartEvents = computed(() =>
  isCoarsePointer.value ? chartEventsCoarse : chartEventsFine
)

const chartData = computed<ChartData<'line'>>(() => {
  if (props.compareConsumption && props.comparisonPoints?.length) {
    const solarByTime = new Map(props.comparisonPoints.map(p => [p.x, p.y]))
    const segments: Array<{ x: number, y: number | null, color: string }> = []

    for (const point of props.points) {
      const solar = solarByTime.get(point.x)
      let color = '#94a3b8'
      if (point.y !== null && solar !== null && solar !== undefined) {
        color = point.y <= solar
          ? METRIC_COLORS.consumptionBelowSolar
          : METRIC_COLORS.consumptionAboveSolar
      }
      segments.push({ ...point, color })
    }

    return {
      datasets: [
        {
          label: props.title,
          data: segments.map(p => ({ x: p.x, y: p.y })),
          segment: {
            borderColor: ctx => segments[ctx.p1DataIndex]?.color ?? '#94a3b8'
          },
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2,
          spanGaps: false
        }
      ]
    }
  }

  return {
    datasets: [
      {
        label: props.title,
        data: props.points,
        borderColor: props.lineColor,
        backgroundColor: props.fillColor,
        fill: false,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2,
        spanGaps: false
      }
    ]
  }
})

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  events: chartEvents.value,
  interaction: {
    mode: 'nearest',
    intersect: false
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const y = ctx.parsed.y
          return y === null ? 'No data' : `${Math.round(y)} ${props.unit}`
        }
      }
    },
    zoom: {
      pan: {
        enabled: !isCoarsePointer.value,
        mode: 'x',
        modifierKey: undefined
      },
      zoom: {
        wheel: { enabled: true },
        pinch: { enabled: !isCoarsePointer.value },
        mode: 'x'
      }
    },
    ...(props.showZeroBaseline
      ? {
          annotation: undefined
        }
      : {})
  },
  scales: {
    x: {
      type: 'time',
      ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
      grid: { display: false }
    },
    y: {
      beginAtZero: props.showZeroBaseline,
      ticks: {
        callback: value => `${value} ${props.unit}`
      }
    }
  }
}))

function resetZoom() {
  chartRef.value?.chart?.resetZoom()
}
</script>

<template>
  <UCard
    :ui="{
      root: `${dashboardSurfaceBorder} h-full`,
      body: 'flex h-full flex-col'
    }"
  >
    <div class="flex items-center justify-between gap-2 mb-3">
      <h3 class="font-medium">
        {{ title }}
      </h3>
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        label="Reset zoom"
        @click="resetZoom"
      />
    </div>

    <p
      v-if="unavailableMessage"
      class="text-sm text-muted mb-3"
    >
      {{ unavailableMessage }}
    </p>

    <div class="h-52 min-h-52 flex-1 touch-pan-y sm:h-64 md:h-72">
      <Line
        v-if="points.length"
        ref="chartRef"
        :data="chartData"
        :options="chartOptions"
      />
      <p
        v-else
        class="text-sm text-muted h-full flex items-center justify-center"
      >
        No data for this period
      </p>
    </div>
  </UCard>
</template>
