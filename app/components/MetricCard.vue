<script setup lang="ts">
import { dashboardSurfaceBorder } from '~/utils/dashboardSurface'

defineProps<{
  title: string
  value: string
  icon: string
  iconClass?: string
  subtitle?: string
  loading?: boolean
  tone?: 'default' | 'warning' | 'error'
  valueClass?: string
}>()
</script>

<template>
  <UCard
    :ui="{
      root: `${dashboardSurfaceBorder} h-full`,
      body: 'flex h-full flex-col p-4 sm:p-5'
    }"
  >
    <UIcon
      :name="icon"
      class="mb-3 size-7 shrink-0"
      :class="iconClass"
    />
    <p class="mb-1 text-sm text-muted">
      {{ title }}
    </p>
    <p
      class="text-2xl font-semibold tracking-tight"
      :class="[
        valueClass || (tone === 'warning' ? 'text-warning' : tone === 'error' ? 'text-error' : 'text-highlighted')
      ]"
    >
      <span
        v-if="loading"
        class="inline-block h-8 w-28 animate-pulse rounded bg-elevated"
      />
      <span v-else>{{ value }}</span>
    </p>
    <div class="mt-auto min-h-9 pt-2">
      <slot name="subtitle">
        <p
          v-if="subtitle"
          class="text-xs text-muted"
        >
          {{ subtitle }}
        </p>
      </slot>
    </div>
  </UCard>
</template>
