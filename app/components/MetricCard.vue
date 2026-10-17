<script setup lang="ts">
defineProps<{
  title: string
  value: string
  subtitle?: string
  loading?: boolean
  tone?: 'default' | 'warning' | 'error'
  valueClass?: string
}>()
</script>

<template>
  <UCard
    :ui="{
      root: 'h-full',
      body: 'flex h-full flex-col p-4 sm:p-5'
    }"
  >
    <p class="text-sm text-muted mb-1">
      {{ title }}
    </p>
    <p
      class="text-2xl font-semibold tracking-tight"
      :class="[
        {
          'text-warning': tone === 'warning',
          'text-error': tone === 'error'
        },
        valueClass
      ]"
    >
      <span v-if="loading" class="inline-block h-7 w-24 animate-pulse rounded bg-elevated" />
      <span v-else>{{ value }}</span>
    </p>
    <div class="mt-auto min-h-9 pt-2">
      <slot name="subtitle">
        <p v-if="subtitle" class="text-xs text-muted">
          {{ subtitle }}
        </p>
      </slot>
    </div>
  </UCard>
</template>
