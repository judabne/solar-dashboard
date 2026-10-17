<script setup lang="ts">
const route = useRoute()
const isHome = computed(() => route.path === '/')

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
