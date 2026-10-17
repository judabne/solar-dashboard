<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
    { name: 'theme-color', content: '#0f172a' }
  ],
  link: [
    { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/pwa-192x192.png' },
    { rel: 'apple-touch-icon', href: '/pwa-192x192.png' }
  ],
  htmlAttrs: { lang: 'en' }
})

useSeoMeta({
  title: 'Solar Dashboard',
  description: 'Mobile-first solar monitoring for MUST and Batali equipment',
  applicationName: 'Solar Dashboard'
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage keepalive />
    </NuxtLayout>
  </UApp>
</template>
