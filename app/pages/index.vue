<script setup lang="ts">
definePageMeta({ layout: 'default', keepalive: true, ssr: false })

// Poll on the page (pre–PR #6), not only inside OverviewTab / KeepAlive tree.
useLatestReadings()
</script>

<template>
  <MainTabPager class="h-full min-h-0" />
</template>
