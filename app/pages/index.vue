<script setup lang="ts">
definePageMeta({ layout: 'default', ssr: false })

// Fetch latest when opening home (no background interval).
useLatestReadings({ poll: true })
</script>

<template>
  <MainTabPager class="h-full min-h-0" />
</template>
