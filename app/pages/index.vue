<script setup lang="ts">
definePageMeta({ layout: 'default', keepalive: true })

// Poll on the page (pre–PR #6), not only inside OverviewTab / KeepAlive tree.
useLatestReadings()
</script>

<template>
  <MainTabPager />
</template>
