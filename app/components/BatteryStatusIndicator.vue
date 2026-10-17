<script setup lang="ts">
import type { BatteryStatus } from '#shared/types/readings'

const props = defineProps<{
  status: BatteryStatus
}>()

const label = computed(() => {
  switch (props.status) {
    case 'charging':
      return 'Charging'
    case 'discharging':
      return 'Discharging'
    case 'idle':
      return 'Idle'
    default:
      return 'Unknown'
  }
})

const icon = computed(() => {
  switch (props.status) {
    case 'charging':
      return 'i-lucide-arrow-up'
    case 'discharging':
      return 'i-lucide-arrow-down'
    case 'idle':
      return 'i-lucide-minus'
    default:
      return 'i-lucide-help-circle'
  }
})
</script>

<template>
  <div class="inline-flex items-center gap-2 rounded-full bg-elevated px-3 py-1.5 text-sm">
    <UIcon :name="icon" class="size-4" />
    <span>{{ label }}</span>
  </div>
</template>
