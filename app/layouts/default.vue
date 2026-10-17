<script setup lang="ts">
const route = useRoute()
const isHome = computed(() => route.path === '/')

/** Matches AppBottomNav chrome + safe-area (viewport-fit=cover). */
const homeMainHeightClass
  = 'h-[calc(100dvh-3.75rem-max(0.5rem,env(safe-area-inset-bottom,0px)))]'

useHead(() => ({
  htmlAttrs: {
    class: isHome.value ? 'h-dvh overflow-hidden overscroll-none' : undefined
  },
  bodyAttrs: {
    class: isHome.value ? 'h-dvh overflow-hidden overscroll-none' : undefined
  }
}))
</script>

<template>
  <div
    class="flex flex-col bg-default text-default"
    :class="isHome ? 'h-dvh min-h-0' : 'min-h-dvh'"
  >
    <div
      class="min-h-0 shrink-0 overflow-hidden"
      :class="isHome ? homeMainHeightClass : 'pb-20'"
    >
      <slot />
    </div>
    <AppBottomNav />
  </div>
</template>
