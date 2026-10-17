<script setup lang="ts">
const isHome = computed(() => useRoute().path === '/')
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-default text-default">
    <div
      class="min-h-0 flex-1"
      :class="isHome
        ? 'h-[calc(100dvh-5rem)] overflow-hidden'
        : 'pb-20'"
    >
      <slot />
    </div>
    <AppBottomNav />
  </div>
</template>
