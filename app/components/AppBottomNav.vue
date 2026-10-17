<script setup lang="ts">
const route = useRoute()

const items = [
  { label: 'Overview', to: '/', icon: 'i-lucide-layout-dashboard' },
  { label: 'Charts', to: '/charts', icon: 'i-lucide-line-chart' }
]

function isActive(path: string) {
  return route.path === path
}
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-default/95 backdrop-blur supports-[backdrop-filter]:bg-default/80"
    aria-label="Main"
  >
    <div class="page-shell-nav grid grid-cols-2 gap-1 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
        :class="isActive(item.to) ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-elevated'"
      >
        <UIcon :name="item.icon" class="size-5" />
        {{ item.label }}
      </NuxtLink>
    </div>
  </nav>
</template>
